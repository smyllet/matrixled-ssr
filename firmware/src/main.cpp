#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Protomatter.h>
#include <AnimatedGIF.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include "secrets.h"

#define DEBUG true // REMINDER: set to "false" before uploading as standalone

/**
 * Upload Instructions:
 * 1. Hold BOOT
 * 2. Press and release RESET
 * 3. Release BOOT
 * 4. Run "Upload & Monitor"
 * 5. Wait for upload to reach 100% then press RESET
 */

// Colors
const auto RED = Adafruit_NeoPixel::Color(255, 0, 0);
const auto ORANGE = Adafruit_NeoPixel::Color(255, 140, 0);
const auto YELLOW = Adafruit_NeoPixel::Color(255, 255, 0);
const auto GREEN = Adafruit_NeoPixel::Color(0, 255, 0);
const auto BLUE = Adafruit_NeoPixel::Color(0, 0, 255);
const auto PURPLE = Adafruit_NeoPixel::Color(153, 50, 204);
const auto BLACK = Adafruit_NeoPixel::Color(0, 0, 0);

// Board-specific status pixel

#define STATUS_PIN 4
Adafruit_NeoPixel statusPixel(1, STATUS_PIN, NEO_GRB + NEO_KHZ800);

// CONFIGURABLE SETTINGS ---------------------------------------------------
#define WIDTH 64  // Matrix width in pixels
#define HEIGHT 32 // Matrix height in pixels

// Configuration for Adafruit MatrixPortal
uint8_t rgbCount = 1;
uint8_t rgbPins[] = {42, 41, 40, 38, 39, 37};
uint8_t addrCount = 4;
uint8_t addrPins[] = {45, 36, 48, 35, 21};
uint8_t clockPin = 2;
uint8_t latchPin = 47;
uint8_t oePin = 14;

// Display settings
uint8_t bitDepth = 6;

// Initialize the matrix
Adafruit_Protomatter matrix(
    WIDTH, bitDepth, rgbCount, rgbPins, addrCount, addrPins, clockPin, latchPin, oePin, false);

// FUNCTION DECLARATIONS ---------------------------------------------------
struct GIFData
{
  uint8_t *pData;
  int iDataSize;
};

void printWifiStatus();
void span(uint16_t *src, int16_t x, int16_t y, int16_t width);
GIFData downloadGIF(const char *url);
void setStatus(const char *message, uint32_t color);

websockets::WebsocketsClient client;

// ANIMATEDGIF LIBRARY STUFF -----------------------------------------------

AnimatedGIF GIF;
int16_t xPos = 0, yPos = 0; // Top-left pixel coord of GIF in matrix space

// Draw one line of image to matrix back buffer
void GIFDraw(GIFDRAW *pDraw)
{
  uint8_t *s;
  uint16_t *d, *usPalette, usTemp[320];
  int x, y;

  y = pDraw->iY + pDraw->y; // current line in image

  // Vertical clip
  int16_t screenY = yPos + y; // current row on matrix
  if ((screenY < 0) || (screenY >= matrix.height()))
    return;

  usPalette = pDraw->pPalette;

  s = pDraw->pPixels;
  // Apply the new pixels to the main image
  if (pDraw->ucHasTransparency)
  { // if transparency used
    uint8_t *pEnd, c, ucTransparent = pDraw->ucTransparent;
    int x, iCount;
    pEnd = s + pDraw->iWidth;
    x = 0;
    iCount = 0; // count non-transparent pixels
    while (x < pDraw->iWidth)
    {
      c = ucTransparent - 1;
      d = usTemp;
      while (c != ucTransparent && s < pEnd)
      {
        c = *s++;
        if (c == ucTransparent)
        {      // done, stop
          s--; // back up to treat it like transparent
        }
        else
        { // opaque
          *d++ = usPalette[c];
          iCount++;
        }
      } // while looking for opaque pixels
      if (iCount)
      { // any opaque pixels?
        span(usTemp, xPos + pDraw->iX + x, screenY, iCount);
        x += iCount;
        iCount = 0;
      }
      // no, look for a run of transparent pixels
      c = ucTransparent;
      while (c == ucTransparent && s < pEnd)
      {
        c = *s++;
        if (c == ucTransparent)
          iCount++;
        else
          s--;
      }
      if (iCount)
      {
        x += iCount; // skip these
        iCount = 0;
      }
    }
  }
  else
  {
    s = pDraw->pPixels;
    // Translate 8-bit pixels through RGB565 palette (already byte reversed)
    for (x = 0; x < pDraw->iWidth; x++)
      usTemp[x] = usPalette[*s++];
    span(usTemp, xPos + pDraw->iX, screenY, pDraw->iWidth);
  }
}

// Copy a horizontal span of pixels from a source buffer to an X,Y position
// in matrix back buffer, applying horizontal clipping. Vertical clipping is
// handled in GIFDraw() above -- y can safely be assumed valid here.
void span(uint16_t *src, int16_t x, int16_t y, int16_t width)
{
  if (x >= matrix.width())
    return;                   // Span entirely off right of matrix
  int16_t x2 = x + width - 1; // Rightmost pixel
  if (x2 < 0)
    return; // Span entirely off left of matrix
  if (x < 0)
  {             // Span partially off left of matrix
    width += x; // Decrease span width
    src -= x;   // Increment source pointer to new start
    x = 0;      // Leftmost pixel is first column
  }
  if (x2 >= matrix.width())
  { // Span partially off right of matrix
    width -= (x2 - matrix.width() + 1);
  }
  if (matrix.getRotation() == 0)
  {
    memcpy(matrix.getBuffer() + y * matrix.width() + x, src, width * 2);
  }
  else
  {
    while (x <= x2)
    {
      matrix.drawPixel(x++, y, *src++);
    }
  }
}

// SETUP RUNS ONCE AT PROGRAM START --------------------------------------
void(* resetFunc) (void) = 0;
void err(const char *message)
{
  setStatus(message, RED);
  delay(5000);
  exit(1);
}

GIFData gifData = {nullptr, 0};
bool GIFisOpen = false; // True if GIF is currently open

void setup()
{
  Serial.begin(9600);

  // Connect to Wi-Fi
  setStatus("Initializing Wi-Fi", YELLOW);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi...");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");

  Serial.println("Connected to WiFi");
  printWifiStatus();

  // Protomatter (RGB Matrix) setup
  setStatus("Initializing Protomatter", GREEN);
  ProtomatterStatus protomatterStatus = matrix.begin();
  Serial.printf("Protomatter begin() status: %d\n", protomatterStatus);
  if (protomatterStatus != PROTOMATTER_OK)
  {
    err("Protomatter failed to initialize");
  }
  matrix.fillScreen(0);
  matrix.show();

  gifData = downloadGIF(RENDERER_URL);

  // GIF setup
  setStatus("Initializing GIF library", BLUE);
  GIF.begin(LITTLE_ENDIAN_PIXELS);

  // try to connect to Websockets server
  client.addHeader("token", RENDERER_TOKEN);
  bool connected = client.connect(RENDERER_HOST, RENDERER_PORT, "/");
  if (connected)
  {
    Serial.println("Connected!");
    client.send("Hello Server");
  }
  else
  {
    err("Failed to connect to Websockets server");
  }

  // run callback when messages are received
  client.onMessage(
      [&](websockets::WebsocketsMessage message)
      {
        Serial.print("Got Message: ");
        Serial.println(message.data());

        JsonDocument doc;
        deserializeJson(doc, message.data());

        if (doc["type"] == "matrix:render:updated")
        {
          gifData = downloadGIF(RENDERER_URL);
        }
      });
}

// LOOP - RUNS INFINITELY --------------------------------------------------
void loop()
{
  // let the websockets client check for incoming messages
  if (client.available())
  {
    client.poll();
  }

  // New GIF data available
  if (gifData.pData != nullptr)
  {
    // If currently playing, stop
    if (GIFisOpen)
    {
      GIF.close();
      matrix.fillScreen(0);
      GIFisOpen = false;
    }

    if (GIF.open(gifData.pData, gifData.iDataSize, GIFDraw))
    {
      delete[] gifData.pData; // free data
      gifData = {nullptr, 0};

      Serial.printf("GIF dimensions: %d x %d\n",
                    GIF.getCanvasWidth(), GIF.getCanvasHeight());
      xPos = (matrix.width() - GIF.getCanvasWidth()) / 2; // Center on matrix
      yPos = (matrix.height() - GIF.getCanvasHeight()) / 2;
      GIFisOpen = true;
    }
  }

  if (GIFisOpen)
  {
    GIF.playFrame(true, NULL);
    matrix.show();
  }
}

// FUNCTION DEFINITIONS ----------------------------------------------------
void setStatus(const char *message, uint32_t color)
{
  if (!DEBUG)
    return;

  Serial.print("Status: ");
  Serial.println(message);

  statusPixel.setBrightness(50);
  statusPixel.setPixelColor(0, color);
  statusPixel.show();
}

void printWifiStatus()
{
  // print the SSID of the network you're attached to:
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  // print your board's IP address:
  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  Serial.println(ip);

  // print the received signal strength:
  long rssi = WiFi.RSSI();
  Serial.print("signal strength (RSSI):");
  Serial.print(rssi);
  Serial.println(" dBm");
}

GIFData downloadGIF(const char *url)
{
  // matrix.fillScreen(0);
  // matrix.show();
  setStatus("Downloading GIF", PURPLE);

  HTTPClient http;

  // Start the HTTP request
  http.begin(url);

  // Start set token
  http.addHeader("token", RENDERER_TOKEN);

  // Perform the request and handle the response
  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK)
  {
    // Get the content length
    int contentLength = http.getSize();

    // Allocate memory for the GIF data
    uint8_t *pData = new uint8_t[contentLength];

    // Get the response stream
    WiFiClient *stream = http.getStreamPtr();

    // Read the data into the buffer
    if (stream->readBytes(pData, contentLength) == contentLength)
    {
      // Close the connection
      http.end();
      setStatus("Downloaded GIF Successfully", BLACK);

      // Create a GIFData struct and populate it
      GIFData gifData;
      gifData.pData = pData;
      gifData.iDataSize = contentLength;

      return gifData;
    }
    else
    {
      Serial.println("Error reading stream into buffer");
      setStatus("Failed to read stream into buffer", RED);
    }
  }
  else
  {
    // If the request fails, print the error code
    Serial.printf("Failed to download GIF. Error code: %d\n", httpCode);
    setStatus("Failed to download Gif", RED);
  }

  // Close the connection
  http.end();

  // If an error occurred, return nullptr for pData and 0 for contentLength
  return {nullptr, 0};
};