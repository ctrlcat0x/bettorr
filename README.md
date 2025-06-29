# Bettorr - Game Torrent Search Engine

A modern, minimalistic web interface for searching game torrents from multiple sources. Built with a beautiful dark theme featuring glass morphism effects, grain texture, and blur elements.

## Features

- 🔍 **Smart Search**: Real-time search with autocomplete functionality
- 🎯 **Source Filtering**: Filter results by specific sources (DODI, FitGirl, KaosKrew, OnlineFix, Xatab)
- ⚡ **Fast Loading**: Optimized search with loading states
- 🎨 **Modern UI**: Dark theme with glass morphism, grain texture, and blur effects
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- 🔗 **Direct Magnet Links**: One-click magnet link downloads

## Sources

The application aggregates game torrents from the following sources:
- **DODI Repacks** - High-quality game repacks
- **FitGirl Repacks** - Compressed game releases
- **KaosKrew** - Game releases and updates
- **OnlineFix** - Online multiplayer fixes
- **Xatab** - Game repacks and releases

## Usage

1. **Search**: Type in the search bar to find games. The autocomplete will suggest matching titles as you type.
2. **Filter**: Use the filter buttons to search within specific sources or view all sources.
3. **Download**: Click the "Download Magnet" button to get the magnet link for your chosen game.

## File Structure

```
bettorr/
├── index.html          # Main HTML file
├── styles.css          # CSS styles with dark theme and glass effects
├── script.js           # JavaScript functionality
├── README.md           # This file
└── magnet_data/        # JSON data files
    ├── dodi.json
    ├── fitgirl.json
    ├── kaoskrew.json
    ├── onlinefix.json
    └── xatab.json
```

## Data Format

Each JSON file contains an array of game downloads with the following structure:

```json
{
  "name": "source_name",
  "downloads": [
    {
      "title": "Game Title",
      "fileSize": "10.5 GB",
      "uris": ["magnet:?xt=..."],
      "uploadDate": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Setup

1. Clone the repository
2. Ensure all JSON data files are in the `magnet_data/` directory
3. Open `index.html` in a web browser
4. Start searching for games!

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with glass morphism and animations
- **JavaScript (ES6+)**: Vanilla JS with modern async/await patterns
- **Font Awesome**: Icons
- **Google Fonts**: Bricolage Grotesque, Fira Mono, and Inter font families

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

Feel free to contribute to this project by:
- Adding new features
- Improving the UI/UX
- Optimizing performance
- Adding new data sources

## License

This project is open source and available under the MIT License.

---

**Note**: This application is for educational purposes. Please ensure you comply with your local laws regarding torrent downloads.
