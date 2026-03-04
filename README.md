# NetSapiens API v1 Documentation

A modern, dark-themed API documentation viewer for the NetSapiens v1 API. This standalone web application provides an intuitive interface for browsing and searching API endpoints with interactive code examples.

![NetSapiens API Documentation](https://img.shields.io/badge/NetSapiens-API%20v1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🎨 Modern Dark Theme
- Professional dark theme inspired by popular developer documentation platforms
- Clean, readable interface with syntax highlighting
- Responsive three-column layout

### 🔍 Smart Navigation
- Collapsible sidebar with organized API groups
- Quick search with keyboard shortcut (Ctrl+K)
- Method badges for easy endpoint identification (GET, POST, PUT, DELETE)

### 💻 Interactive Code Examples
- Multi-language support (Shell, Node.js, Python, PHP, Ruby)
- One-click copy for URLs and code snippets
- Auto-generated examples based on endpoint parameters
- Interactive parameter input forms with live URL generation
- Server URL configuration for realistic API calls

### 📋 Comprehensive Documentation
- 550+ API endpoints with detailed descriptions
- Enhanced parameter documentation from Postman collection
- Required/optional parameter indicators with smart input types
- Authentication requirements clearly marked
- Response status codes and examples

## Quick Start

### Option 1: Python HTTP Server
```bash
# Navigate to the project directory
cd ns-api-v1

# Start the server
python3 -m http.server 8888

# Open in browser
# http://localhost:8888
```

### Option 2: Node.js HTTP Server
```bash
# Install http-server globally (if not already installed)
npm install -g http-server

# Start the server
http-server -p 8888

# Open in browser
# http://localhost:8888
```

### Option 3: Direct File Access
Simply open `index.html` in your web browser for local file access.

## Project Structure

```
ns-api-v1/
├── index.html              # Main application HTML
├── app.js                  # Application logic and API handling
├── style.css               # Dark theme styling
├── netsapiens_v1_api.json  # API endpoint definitions (550+ endpoints)
└── README.md               # This file
```

## Usage

### Browsing Endpoints
1. Configure your server URL in the sidebar input field
2. Click on any API group in the left sidebar to expand it
3. Select an endpoint to view its documentation
4. Fill in interactive parameter forms to see live API URLs
5. View detailed descriptions, authentication requirements, and response information

### Searching
- Press `Ctrl+K` or click the search bar
- Type to search across all endpoints
- Results appear instantly in the sidebar

### Interactive Code Examples
1. Configure your server URL in the sidebar input
2. Select an endpoint from the sidebar
3. Fill in parameter values using the interactive forms
4. Watch the code examples update in real-time with your values
5. Choose your preferred language from the tabs (Shell, Node, Python, PHP, Ruby)
6. Click "Copy" to copy the complete example code with your parameters

## Configuration

### Base URL
The API base URL format is: `https://{server}/ns-api/`

Replace `{server}` with your actual NetSapiens server hostname.

### Authentication
Most endpoints require Bearer token authentication. Include your access token in the Authorization header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## API Coverage

The documentation includes **550+ endpoints** across **62 API groups**, enhanced with detailed descriptions from the Postman test collection:

- **Address** - Endpoint management and addressing
- **Agent** - Agent operations and call center features  
- **Call** - Call handling, recording, and management
- **Conference** - Conference features and participant management
- **Device** - Device provisioning and configuration
- **Domain** - Domain configuration and billing
- **Message** - Messaging, chat, and communication features
- **Phone Numbers** - Number management and SMS
- **Recording** - Call recording and media management
- **User** - User management and authentication
- **CDR** - Call detail records and reporting
- **Meeting** - Meeting and collaboration features
- **Route** - Routing and connection management
- And 49+ additional specialized groups...

## Development

### Technologies Used
- **Vanilla JavaScript** - No framework dependencies
- **Pure CSS** - Custom dark theme styling
- **HTML5** - Semantic markup
- **JSON** - API data storage

### Customization
To customize the appearance, modify:
- `style.css` - Update color variables in `:root` section
- `app.js` - Modify code generation templates for different languages

### Adding New Endpoints
Edit `netsapiens_v1_api.json` to add or modify API endpoints. The structure follows:
```json
{
  "type": "POST",
  "url": "?object=example&action=create",
  "title": "Create Example",
  "group": "Example Group",
  "parameter": { ... },
  "success": { ... }
}
```

## Browser Support
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Opera 74+

## Contributing
Contributions are welcome! Please feel free to submit issues or pull requests.

## License
MIT License - feel free to use this project for your own NetSapiens API documentation needs.

## Credits
Built with modern web technologies to provide a superior developer experience for NetSapiens API integration.

---

**Note:** This is an unofficial documentation viewer. For official NetSapiens documentation, please refer to your NetSapiens provider's documentation portal.