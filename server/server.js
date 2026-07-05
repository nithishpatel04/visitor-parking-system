const http = require('http');
const fs = require('fs');
const path = require('path');

// Lambda handler export (for AWS Lambda)
exports.handler = async (event, context) => {
  // Lazy load modules inside handler to avoid ES module resolution issues
  const cors = require('./middleware/cors');
  const parkingRoutes = require('./routes/parkingRoutes');
  const adminRoutes = require('./routes/adminRoutes');
  const { handleAuthRoutes } = require('./routes/authRoutes');

  const clientDir = path.join(__dirname, '..', 'client');

  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  function sendFile(res, filePath) {
    try {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      res.end(data);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  }

  function serveStatic(req, res) {
    let requestPath = req.url === '/' ? '/index.html' : req.url;
    requestPath = requestPath.split('?')[0];

    if (requestPath === '/admin') {
      requestPath = '/admin.html';
    } else if (requestPath === '/parking') {
      requestPath = '/parking.html';
    } else if (requestPath === '/print') {
      requestPath = '/print.html';
    }

    const safePath = path.normalize(requestPath).replace(/^(\.|\/)+/, '');
    const filePath = path.join(clientDir, safePath);

    if (!filePath.startsWith(clientDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    sendFile(res, filePath);
  }

  return new Promise((resolve, reject) => {
    try {
      // Debug logging - log the entire event
      console.log('Raw Event:', JSON.stringify(event, null, 2));

      const mockReq = {
        method: event.httpMethod || 'GET',
        url: event.path || event.rawPath || event.requestContext?.path || '/',
        headers: event.headers || {},
        body: event.body || ''
      };
      
      console.log('Parsed Request:', { method: mockReq.method, url: mockReq.url });

    const mockRes = {
      statusCode: 200,
      headers: {},
      body: '',
      setHeader: function(key, value) {
        this.headers[key] = value;
      },
      writeHead: function(code, headers) {
        this.statusCode = code;
        if (headers) Object.assign(this.headers, headers);
      },
      end: function(data) {
        this.body = data || '';
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: this.body,
          isBase64Encoded: false
        });
      }
    };

    cors(mockReq, mockRes, () => {
      try {
        if (mockReq.url.startsWith('/api/')) {
          const pathname = mockReq.url.split('?')[0];
          const method = mockReq.method;
          
          const authHandled = handleAuthRoutes(mockReq, mockRes, pathname, method);
          if (authHandled === true) return;

          const parkingHandled = parkingRoutes(mockReq, mockRes);
          if (parkingHandled !== null) return;

          const adminHandled = adminRoutes(mockReq, mockRes);
          if (adminHandled !== null) return;

          mockRes.writeHead(404, { 'Content-Type': 'application/json' });
          mockRes.end(JSON.stringify({ error: 'Route not found' }));
          return;
        }

        // Lambda doesn't serve static files - frontend is on GitHub Pages
        mockRes.writeHead(404, { 'Content-Type': 'application/json' });
        mockRes.end(JSON.stringify({ error: 'Static files served from GitHub Pages' }));
      } catch (error) {
        console.error('Error in route handler:', error);
        mockRes.writeHead(500, { 'Content-Type': 'application/json' });
        mockRes.end(JSON.stringify({ error: error.message }));
      }
    });
  });
};

// Local development server (only runs when executed directly with node, not in Lambda)
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const cors = require('./middleware/cors');
  const parkingRoutes = require('./routes/parkingRoutes');
  const adminRoutes = require('./routes/adminRoutes');
  const { handleAuthRoutes } = require('./routes/authRoutes');

  const clientDir = path.join(__dirname, '..', 'client');

  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  function sendFile(res, filePath) {
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  }

  function serveStatic(req, res) {
    let requestPath = req.url === '/' ? '/index.html' : req.url;
    requestPath = requestPath.split('?')[0];

    if (requestPath === '/admin') {
      requestPath = '/admin.html';
    } else if (requestPath === '/parking') {
      requestPath = '/parking.html';
    } else if (requestPath === '/print') {
      requestPath = '/print.html';
    }

    const safePath = path.normalize(requestPath).replace(/^(\.|\/)+/, '');
    const filePath = path.join(clientDir, safePath);

    if (!filePath.startsWith(clientDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    sendFile(res, filePath);
  }

  const server = http.createServer((req, res) => {
    cors(req, res, () => {
      if (req.url.startsWith('/api/')) {
        const pathname = req.url.split('?')[0];
        const method = req.method;
        
        const authHandled = handleAuthRoutes(req, res, pathname, method);
        if (authHandled === true) {
          return;
        }

        const parkingHandled = parkingRoutes(req, res);
        if (parkingHandled !== null) {
          return;
        }

        const adminHandled = adminRoutes(req, res);
        if (adminHandled !== null) {
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Route not found' }));
        return;
      }

      serveStatic(req, res);
    });
  });

  server.listen(port, () => {
    console.log(`Parking management website is running on http://localhost:${port}`);
  });
}
