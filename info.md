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

## 🙏 About This Fork

This is a maintained fork of the original [Select List Card](https://github.com/mattieha/select-list-card) by mattieha. This fork was created to address compatibility issues with recent Home Assistant updates and ensure continued functionality.

## Configuration

Minimal setup required - just specify your `input_select` entity:

```yaml
type: custom:select-list-card
entity: input_select.my_options
```

### Full Configuration Options

```yaml
type: custom:select-list-card
entity: input_select.music_playlist
title: Music Playlists
icon: 'mdi:playlist-music'
max_options: 6
scroll_to_selected: true
show_toggle: true
truncate: true
scroll_behavior: smooth
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | An `input_select` entity |
| `title` | string | `""` | Card header title |
| `icon` | string | `""` | Card header icon (any icon name) |
| `show_toggle` | boolean | `false` | Show collapsible header |
| `truncate` | boolean | `true` | Truncate long option text |
| `scroll_to_selected` | boolean | `true` | Auto-scroll to selected option |
| `max_options` | number | `5` | Max visible options (0 = unlimited) |
| `scroll_behavior` | string | `smooth` | Scroll animation: `smooth` or `auto` |
