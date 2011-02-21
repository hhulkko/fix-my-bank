#!/usr/bin/python

from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SimpleHTTPServer import SimpleHTTPRequestHandler

session = {}

class FakeBankRequestHandler(SimpleHTTPRequestHandler):
  def do_POST(self):
    session['servenext'] = self.path
    SimpleHTTPRequestHandler.do_GET(self)

  def do_GET(self):
    self.path = session.pop('servenext', self.path)
    SimpleHTTPRequestHandler.do_GET(self)

def main():
  BaseHTTPRequestHandler.protocol_version = "HTTP/1.0"
  httpd = HTTPServer(('', 8000), FakeBankRequestHandler)
  sa = httpd.socket.getsockname()
  print "Serving HTTP on", sa[0], "port", sa[1], "..."
  httpd.serve_forever()

if __name__ == '__main__':
  main()
