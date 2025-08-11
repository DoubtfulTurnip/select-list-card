// Select List Card - Standalone Version (Fixed Scrolling)
// No external dependencies required

console.info(
  `%c  SELECT-LIST-CARD  \n%c  Version 2.0.1 (Fixed Scrolling)     `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

class SelectListCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = null;
    this._hass = null;
    this._isOpen = true;
    this._scrollPosition = 0; // Track scroll position
    this._isUpdating = false; // Prevent scroll conflicts during updates
    this._isSelecting = false; // Prevent multiple simultaneous selections
    this._lastUpdateTime = 0; // Throttle updates
    this._updateTimeout = null; // For queued updates
  }

  static getConfigElement() {
    // Return a simple config element for now
    const element = document.createElement('div');
    element.innerHTML = 'Please configure this card manually in YAML';
    return element;
  }

  static getStubConfig(hass, entities) {
    const inputSelectEntities = entities.filter(e => e.startsWith("input_select"));
    return {
      type: "custom:select-list-card",
      entity: inputSelectEntities[0] || "",
      title: "Select an option",
      show_toggle: false,
      truncate: true,
      scroll_to_selected: true,
      max_options: 5
    };
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration: config is required');
    }
    
    if (!config.entity) {
      throw new Error('Invalid configuration: entity is required');
    }
    
    if (!config.entity.startsWith('input_select.')) {
      throw new Error('Invalid configuration: entity must be an input_select');
    }

    // Set defaults
    this._config = {
      title: '',
      icon: '',
      show_toggle: false,
      truncate: true,
      scroll_to_selected: true,
      max_options: 5,
      ...config
    };

    this._isOpen = !this._config.show_toggle; // Start open unless toggle is enabled
    this._updateCard();
  }

  set hass(hass) {
    const oldHass = this._hass;
    const oldEntity = oldHass && this._config ? oldHass.states[this._config.entity] : null;
    const newEntity = this._config ? hass.states[this._config.entity] : null;
    
    this._hass = hass;
    
    // Only update if entity actually changed or if this is the first time
    if (oldEntity && newEntity) {
      const stateChanged = oldEntity.state !== newEntity.state;
      const optionsChanged = JSON.stringify(oldEntity.attributes.options) !== JSON.stringify(newEntity.attributes.options);
      
      if (!stateChanged && !optionsChanged) {
        return; // Skip update if nothing relevant changed
      }
      
      // If we were selecting and the state changed, re-enable immediately
      if (stateChanged && this._isSelecting) {
        this._isSelecting = false;
      }
    }
    
    // Throttle updates to prevent render loops
    const now = Date.now();
    if (now - this._lastUpdateTime < 100) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = setTimeout(() => {
        this._lastUpdateTime = Date.now();
        this._updateCard();
      }, 100);
      return;
    }
    this._lastUpdateTime = now;
    
    // Clear any pending timeouts
    clearTimeout(this._updateTimeout);
    
    this._updateCard();
  }

  get hass() {
    return this._hass;
  }

  _saveScrollPosition() {
    const container = this.shadowRoot?.querySelector('.options-list');
    if (container) {
      this._scrollPosition = container.scrollTop;
    }
  }

  _restoreScrollPosition() {
    const container = this.shadowRoot?.querySelector('.options-list');
    if (container && this._scrollPosition !== undefined) {
      container.scrollTop = this._scrollPosition;
    }
  }

  _updateCard() {
    if (!this._config || !this._hass) {
      return;
    }

    const entity = this._hass.states[this._config.entity];
    if (!entity) {
      this._renderError(`Entity "${this._config.entity}" not found`);
      return;
    }

    // Save scroll position before updating
    this._saveScrollPosition();
    this._isUpdating = true;
    
    this._renderCard(entity);
    
    // Restore scroll position after DOM update
    setTimeout(() => {
      // Update disabled state based on current selection status
      this._updateDisabledState(this._isSelecting);
      
      if (!this._config.scroll_to_selected || !this._isOpen) {
        this._restoreScrollPosition();
      } else {
        // Only auto-scroll to selected if we're opening for the first time
        const container = this.shadowRoot?.querySelector('.options-list');
        if (container && container.scrollTop === 0) {
          this._scrollToSelected();
        }
      }
      this._isUpdating = false;
    }, 0);
  }

  _renderError(message) {
    this.shadowRoot.innerHTML = `
      <style>
        .error-card {
          background: var(--card-background-color, white);
          border-radius: 8px;
          padding: 16px;
          box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
          color: var(--error-color, #f44336);
          text-align: center;
        }
      </style>
      <div class="error-card">
        <div>⚠️ Error</div>
        <div>${message}</div>
      </div>
    `;
  }

  _renderCard(entity) {
    const currentValue = entity.state;
    const options = entity.attributes.options || [];
    
    // Calculate dimensions
    const maxOptions = this._config.max_options === 0 ? options.length : Math.min(this._config.max_options, options.length);
    const itemHeight = 48;
    const listMaxHeight = maxOptions * itemHeight;

    const styles = `
      <style>
        * {
          box-sizing: border-box;
        }
        
        .card-container {
          background: var(--card-background-color, white);
          border-radius: var(--ha-card-border-radius, 8px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0,0,0,0.1));
          overflow: hidden;
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
          -webkit-font-smoothing: antialiased;
        }
        
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--primary-background-color, white);
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          font-weight: 500;
          font-size: 16px;
          user-select: none;
          min-height: 56px;
        }
        
        .card-header.clickable {
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .card-header.clickable:hover {
          background: var(--secondary-background-color, #fafafa);
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .header-icon {
          width: 24px;
          height: 24px;
          color: var(--primary-color, #1976d2);
        }
        
        .toggle-icon {
          width: 24px;
          height: 24px;
          transition: transform 0.3s ease;
          color: var(--secondary-text-color, #666);
        }
        
        .toggle-icon.rotated {
          transform: rotate(180deg);
        }
        
        .options-container {
          overflow: hidden;
          transition: max-height 0.3s ease-in-out;
          max-height: ${this._isOpen ? listMaxHeight : 0}px;
        }
        
        .options-list {
          max-height: ${listMaxHeight}px;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: smooth;
        }
        
        .options-list::-webkit-scrollbar {
          width: 8px;
        }
        
        .options-list::-webkit-scrollbar-track {
          background: var(--scrollbar-track-color, rgba(0, 0, 0, 0.05));
          border-radius: 4px;
        }
        
        .options-list::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb-color, rgba(0, 0, 0, 0.2));
          border-radius: 4px;
          border: 1px solid transparent;
        }
        
        .options-list::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-color, rgba(0, 0, 0, 0.3));
        }
        
        .option-item {
          display: flex;
          align-items: center;
          padding: 0 16px;
          min-height: ${itemHeight}px;
          cursor: pointer;
          transition: all 0.15s ease;
          border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
          font-size: 14px;
          user-select: none;
          position: relative;
        }
        
        .option-item:last-child {
          border-bottom: none;
        }
        
        .option-item:not(.selected):hover {
          background-color: var(--state-hover-color, rgba(0, 0, 0, 0.04));
        }
        
        .option-item:active {
          transform: scale(0.98);
        }
        
        .option-item.selected {
          background-color: var(--primary-color, #1976d2);
          color: white;
          font-weight: 500;
        }
        
        .option-item.selected:hover {
          background-color: var(--dark-primary-color, #1565c0);
        }
        
        .option-item.disabled {
          pointer-events: none;
          opacity: 0.6;
        }
        
        .option-text {
          flex: 1;
          line-height: 1.4;
        }
        
        .option-text.truncate {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        
        .no-options {
          padding: 16px;
          text-align: center;
          color: var(--secondary-text-color, #666);
          font-style: italic;
        }
      </style>
    `;

    // Create SVG icons inline
    const chevronDown = `<svg class="toggle-icon ${this._isOpen ? 'rotated' : ''}" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>`;
    const customIcon = this._config.icon ? `<svg class="header-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>` : '';

    const headerHTML = this._config.title ? `
      <div class="card-header ${this._config.show_toggle ? 'clickable' : ''}" onclick="this.getRootNode().host._handleHeaderClick()">
        <div class="header-left">
          ${customIcon}
          <span>${this._config.title}</span>
        </div>
        ${this._config.show_toggle ? chevronDown : ''}
      </div>
    ` : '';

    const optionsHTML = options.length > 0 ? options.map(option => {
      const isSelected = currentValue === option;
      const safeOption = option.replace(/'/g, "\\'").replace(/"/g, '\\"');
      
      return `
        <div class="option-item ${isSelected ? 'selected' : ''}" 
             onclick="this.getRootNode().host._selectOption('${safeOption}')"
             title="${this._config.truncate ? option : ''}">
          <div class="option-text ${this._config.truncate ? 'truncate' : ''}">
            ${option}
          </div>
        </div>
      `;
    }).join('') : '<div class="no-options">No options available</div>';

    this.shadowRoot.innerHTML = `
      ${styles}
      <div class="card-container">
        ${headerHTML}
        <div class="options-container">
          <div class="options-list">
            ${optionsHTML}
          </div>
        </div>
      </div>
    `;

    // Add scroll event listener to save position
    const optionsList = this.shadowRoot.querySelector('.options-list');
    if (optionsList) {
      optionsList.addEventListener('scroll', () => {
        if (!this._isUpdating) {
          this._scrollPosition = optionsList.scrollTop;
        }
      });
    }
  }

  _handleHeaderClick() {
    if (!this._config.show_toggle) return;
    
    this._isOpen = !this._isOpen;
    if (this._isOpen) {
      this._scrollPosition = 0; // Reset scroll when opening
    }
    this._updateCard();
  }

  _scrollToSelected() {
    if (!this._config.scroll_to_selected) return;
    
    const container = this.shadowRoot.querySelector('.options-list');
    const selectedItem = this.shadowRoot.querySelector('.option-item.selected');
    
    if (container && selectedItem) {
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemHeight = selectedItem.clientHeight;
      
      // Calculate scroll position to center the selected item
      const scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
      
      // Ensure we don't scroll beyond boundaries
      const maxScroll = container.scrollHeight - containerHeight;
      const targetScroll = Math.max(0, Math.min(scrollTop, maxScroll));
      
      container.scrollTop = targetScroll;
      this._scrollPosition = targetScroll;
    }
  }

  async _selectOption(option) {
    if (!this._hass || !this._config || this._isSelecting) {
      return;
    }
    
    const entity = this._hass.states[this._config.entity];
    if (!entity || entity.state === option) return;

    // Prevent multiple simultaneous selections
    this._isSelecting = true;
    
    // Update DOM immediately to show disabled state
    this._updateDisabledState(true);

    try {
      await this._hass.callService('input_select', 'select_option', {
        entity_id: this._config.entity,
        option: option
      });
      
    } catch (error) {
      console.error('Select List Card: Failed to select option:', error);
      
      // Visual error feedback
      const optionElements = this.shadowRoot.querySelectorAll('.option-item');
      optionElements.forEach(el => {
        if (el.textContent.trim() === option) {
          el.style.backgroundColor = 'var(--error-color, #f44336)';
          el.style.color = 'white';
          setTimeout(() => {
            el.style.backgroundColor = '';
            el.style.color = '';
          }, 2000);
        }
      });
      
      // Re-enable immediately on error
      this._isSelecting = false;
      this._updateDisabledState(false);
    }
    
    // Set a maximum timeout to ensure we always re-enable
    setTimeout(() => {
      if (this._isSelecting) {
        this._isSelecting = false;
        this._updateDisabledState(false);
      }
    }, 2000);
  }

  _updateDisabledState(disabled) {
    const optionElements = this.shadowRoot.querySelectorAll('.option-item');
    optionElements.forEach(el => {
      if (disabled) {
        el.classList.add('disabled');
      } else {
        el.classList.remove('disabled');
      }
    });
  }

  getCardSize() {
    if (!this._config) return 1;
    
    let size = 0;
    
    // Header size
    if (this._config.title) {
      size += 1;
    }
    
    // Options size (only count visible options)
    if (this._hass && this._config.entity) {
      const entity = this._hass.states[this._config.entity];
      if (entity && entity.attributes.options) {
        const optionsCount = entity.attributes.options.length;
        const maxOptions = this._config.max_options === 0 ? optionsCount : Math.min(this._config.max_options, optionsCount);
        size += maxOptions;
      }
    }
    
    return Math.max(size, 1);
  }
}

// Register the element
if (!customElements.get('select-list-card')) {
  customElements.define('select-list-card', SelectListCard);
}

// Register with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'select-list-card',
  name: 'Select List Card',
  description: 'Display input_select options as a clickable list',
  preview: true
});
