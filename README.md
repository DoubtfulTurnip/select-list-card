# Select List Card

[![GitHub Release][releases-shield]][releases] 
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-default-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)

Display the options of an `input_select` entity as a clickable list card.   
In other words: the content of the dropdown menu is displayed as a card.  
The `input_select.select_option` service is called after the user clicks (selects) an option.

## 🙏 Credits

This is a fork of the original [Select List Card](https://github.com/mattieha/select-list-card) by [mattieha](https://github.com/mattieha). All credit for the original concept and implementation goes to the original author. This fork was created to address compatibility issues with recent Home Assistant updates, while also improving scrolling behavior and performance.

## 🔧 Why This Fork Exists

The original Select List Card stopped working after Home Assistant 2025.5 due to the removal of Polymer components and `paper-*` CSS variables. This fork addresses the compatibility issues and ensures the card continues to work with modern Home Assistant versions.

**Original issue:** [Card not working after 2025.5](https://github.com/mattieha/select-list-card/issues/34) - Multiple users confirmed this fix resolves the problem.

## ✨ Version 2.0.2 - Performance Optimizations & New Features

**Major improvements:**
- 🏠 **Home Assistant Compatibility** - Updated for recent Home Assistant versions
- 🔧 **Fixed scrolling issues** - Proper scroll position management during updates
- ⚡ **Enhanced performance** - DOM caching, optimized rendering, and memory management
- 🎯 **New scroll_behavior option** - Choose between smooth or instant scrolling
- 🚫 **Improved UX** - Options disabled during selection to prevent conflicts
- 🛡️ **Stability improvements** - Prevents render loops and multiple simultaneous selections
- 🧹 **Memory optimization** - Better cleanup and resource management

**Community Contributions:**
- Performance optimizations and new features contributed by [@catohagen](https://github.com/catohagen)

![List animation][card-scroll-gif]

## 🎯 Use Cases

- Select with too many options to show in dropdown
- Options with long titles that need full visibility
- Have all options directly shown without extra clicks
- Avoid the dropdown menu interaction entirely
- Better accessibility for touch interfaces

## 🎨 Using the Card

### Visual Editor

Select List Card supports Lovelace's Visual Editor. Click the + button to add a card and search for "Select List".

![Visual Editor][visual-editor]

### Configuration Options

| Name               | Type    | Default      | Description                                                                 |
| ------------------ | ------- | ------------ | --------------------------------------------------------------------------- |
| type               | string  | **required** | `custom:select-list-card`                                                   |
| entity             | string  | **required** | An entity_id within the `input_select` domain.                              |
| title              | string  | `""`         | Card header title                                                           |
| icon               | string  | `""`         | Card header icon (MDI format: `mdi:icon-name`)                             |
| show_toggle        | boolean | `false`      | Show collapsible header with toggle button                                 |
| truncate           | boolean | `true`       | Truncate long option text to fit on one line                               |
| scroll_to_selected | boolean | `true`       | Auto-scroll to the currently selected option when card opens               |
| max_options        | number  | `5`          | Maximum visible options before scrollbar appears (0 = unlimited)           |
| scroll_behavior    | string  | `smooth`     | Scroll animation type: `smooth` (animated) or `auto` (instant)             |

### Example Configuration

```yaml
type: 'custom:select-list-card'
entity: input_select.music_playlist
title: Music Playlists
icon: 'mdi:playlist-music'
max_options: 6
scroll_to_selected: true
show_toggle: true
truncate: true
scroll_behavior: smooth
```

### Advanced Example

```yaml
type: 'custom:select-list-card'
entity: input_select.location_modes
title: Location Modes
icon: 'mdi:map-marker'
max_options: 0          # No scrollbar - show all options
scroll_to_selected: false
show_toggle: false
truncate: false         # Show full text for long options
scroll_behavior: auto   # Instant scrolling for quick selection
```

## 📦 Installation

### HACS (Recommended)

1. Ensure [HACS][hacs] is installed
2. Go to HACS → Frontend
3. Search for "Select List Card"
4. Click Install
5. Restart Home Assistant
6. Add the card to your dashboard

### Manual Installation

1. Download `select-list-card.js` from the [latest release][latest-release]
2. Copy to your `config/www/` folder
3. Add the resource in Home Assistant:

   **Via UI:** Configuration → Lovelace Dashboards → Resources → Add Resource
   - URL: `/local/select-list-card.js`
   - Resource Type: `JavaScript Module`

   **Via YAML:** Add to your `configuration.yaml`:
   ```yaml
   lovelace:
     resources:
       - url: /local/select-list-card.js
         type: module
   ```

4. Restart Home Assistant
5. Add the card using `custom:select-list-card`



## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Original Repository

This fork is based on the excellent work by [mattieha](https://github.com/mattieha). Consider contributing to the [original repository](https://github.com/mattieha/select-list-card) as well if your improvements are applicable to the original codebase.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

<!-- References -->
[hacs]: https://hacs.xyz
[visual-editor]: https://raw.githubusercontent.com/DoubtfulTurnip/select-list-card/master/assets/visual_editor.png
[card-scroll-gif]: https://raw.githubusercontent.com/DoubtfulTurnip/select-list-card/master/assets/card_scroll.gif
[latest-release]: https://github.com/DoubtfulTurnip/select-list-card/releases/latest
[add-translation]: https://github.com/DoubtfulTurnip/select-list-card/issues
[releases-shield]: https://img.shields.io/github/release/DoubtfulTurnip/select-list-card.svg?style=for-the-badge
[releases]: https://github.com/DoubtfulTurnip/select-list-card/releases
[license-shield]: https://img.shields.io/github/license/DoubtfulTurnip/select-list-card.svg?style=for-the-badge
