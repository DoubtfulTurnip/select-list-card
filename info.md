# Select List Card

Display the options of an `input_select` entity as a clickable list card. 

## ✨ Key Features

- **Direct Option Selection** - Click options directly without dropdown menus
- **Scrollable Lists** - Handle long option lists with smooth scrolling
- **Auto-scroll to Selected** - Automatically centers the current selection
- **Collapsible Header** - Optional toggle to expand/collapse the list
- **Text Truncation** - Smart handling of long option names
- **Visual Feedback** - Clear indication of selected options and loading states

## 🎯 Perfect For

- Music playlists with many tracks
- Location modes and scenes
- Long lists of automation options
- Any input_select with numerous choices

## 🔧 Version 2.0.1 Improvements

- **Fixed scrolling issues** - Maintains scroll position during updates
- **Better performance** - Optimized rendering and state management
- **Enhanced error handling** - Visual feedback for failed selections
- **Improved UX** - Prevents conflicts during option changes
- **Home Assistant compatibility** - Updated for recent HA versions

## Configuration

Minimal setup required - just specify your `input_select` entity:

```yaml
type: custom:select-list-card
entity: input_select.my_options
```

Full customization available with title, icons, scrolling behavior, and visual options.
