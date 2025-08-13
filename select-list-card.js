// Select List Card - Fixed Toggle Version 2.0.3
// Fixes the toggle functionality issue

console.info(
  `%c  SELECT-LIST-CARD  \n%c  Version 2.0.3 (Fixed Toggle)     `,
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
    this._scrollPosition = 0;
    this._isUpdating = false;
    this._isSelecting = false;
    this._lastUpdateTime = 0;
    this._updateTimeout = null;
    
    // Cache DOM elements and computed values
    this._domCache = new Map();
    this._lastEntityState = null;
    this._lastOptions = null;
  }

  static getConfigElement() {
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
      max_options: 5,
      scroll_behavior: 'smooth'
    };
  }

  setConfig(config) {
    if (!config?.entity) {
      throw new Error('Invalid configuration: entity is required');
    }
    
    if (!config.entity.startsWith('input_select.')) {
      throw new Error('Invalid configuration: entity must be an input_select');
    }

    // Set defaults
    this._config = {
      title: '',
      icon: null,  // Changed from empty string to null
      show_toggle: false,
      truncate: true,
      scroll_to_selected: true,
      max_options: 5,
      scroll_behavior: 'smooth',
      ...config
    };

    // Remove empty icon property if it exists
    if (this._config.icon === '') {
      delete this._config.icon;
    }

    // Start closed if toggle is enabled
    this._isOpen = !this._config.show_toggle;
    this._clearCache();
    this._updateCard();
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    
    if (!this._config) return;
    
    const entity = hass.states[this._config.entity];
    if (!entity) {
      this._renderError(`Entity "${this._config.entity}" not found`);
      return;
    }

    // Check if relevant data actually changed
    const stateChanged = this._lastEntityState !== entity.state;
    const optionsChanged = JSON.stringify(this._lastOptions) !== JSON.stringify(entity.attributes.options);
    
    if (!stateChanged && !optionsChanged && oldHass) {
      return;
    }
    
    this._lastEntityState = entity.state;
    this._lastOptions = entity.attributes.options;
    
    if (stateChanged && this._isSelecting) {
      this._isSelecting = false;
    }
    
    // Throttle updates
    const now = performance.now();
    if (now - this._lastUpdateTime < 50) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = setTimeout(() => this._performUpdate(), 50);
      return;
    }
    
    this._performUpdate();
  }

  get hass() {
    return this._hass;
  }

  _performUpdate() {
    this._lastUpdateTime = performance.now();
    clearTimeout(this._updateTimeout);
    this._updateCard();
  }

  _clearCache() {
    this._domCache.clear();
    this._lastEntityState = null;
    this._lastOptions = null;
  }

  _saveScrollPosition() {
    const container = this._getCachedElement('options-list');
    if (container) {
      this._scrollPosition = container.scrollTop;
    }
  }

  _restoreScrollPosition() {
    const container = this._getCachedElement('options-list');
    if (container && this._scrollPosition !== undefined) {
      container.scrollTop = this._scrollPosition;
    }
  }

  _getCachedElement(selector) {
    if (!this._domCache.has(selector)) {
      const element = this.shadowRoot?.querySelector(`.${selector}`);
      if (element) {
        this._domCache.set(selector, element);
      }
    }
    return this._domCache.get(selector);
  }

  _updateCard() {
    if (!this._config || !this._hass) return;

    const entity = this._hass.states[this._config.entity];
    if (!entity) {
      this._renderError(`Entity "${this._config.entity}" not found`);
      return;
    }

    this._saveScrollPosition();
    this._isUpdating = true;
    
    this._renderCard(entity);
    this._domCache.clear();
    
    requestAnimationFrame(() => {
      this._updateDisabledState(this._isSelecting);
      
      if (!this._config.scroll_to_selected || !this._isOpen) {
        this._restoreScrollPosition();
      } else {
        const container = this._getCachedElement('options-list');
        if (container && container.scrollTop === 0) {
          this._scrollToSelected();
        }
      }
      this._isUpdating = false;
    });
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
        
        .card-header.clickable:active {
          background: var(--divider-color, #e0e0e0);
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
          transition: transform 0.2s ease;
          color: var(--secondary-text-color, #666);
          pointer-events: none; /* Ensure clicks pass through to header */
        }
        
        .toggle-icon.rotated {
          transform: rotate(180deg);
        }
        
        .options-container {
          overflow: hidden;
          transition: max-height 0.2s ease-in-out;
          max-height: ${this._isOpen ? listMaxHeight : 0}px;
        }
        
        .options-list {
          max-height: ${listMaxHeight}px;
          overflow-y: auto;
          overflow-x: hidden;
          scroll-behavior: var(--scroll-behavior, smooth);
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
          transition: background-color 0.15s ease;
          border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
          font-size: 14px;
          user-select: none;
        }
        
        .option-item:last-child {
          border-bottom: none;
        }
        
        .option-item:not(.selected):hover {
          background-color: var(--state-hover-color, rgba(0, 0, 0, 0.04));
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

    const chevronDown = `<svg class="toggle-icon ${this._isOpen ? 'rotated' : ''}" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>`;
    
    // Only show icon if it's defined and not empty
    const customIcon = (this._config.icon && this._config.icon !== '') ? 
      `<svg class="header-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>` : '';

    const headerHTML = this._config.title ? `
      <div class="card-header ${this._config.show_toggle ? 'clickable' : ''}">
        <div class="header-left">
          ${customIcon}
          <span>${this._config.title}</span>
        </div>
        ${this._config.show_toggle ? chevronDown : ''}
      </div>
    ` : '';

    const optionsHTML = options.length > 0 ? options.map(option => {
      const isSelected = currentValue === option;
      const safeOption = this._escapeHtml(option);
      
      return `
        <div class="option-item ${isSelected ? 'selected' : ''}" data-option="${safeOption}"
             ${this._config.truncate ? `title="${safeOption}"` : ''}>
          <div class="option-text ${this._config.truncate ? 'truncate' : ''}">
            ${safeOption}
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

    // Attach event listeners immediately after rendering
    this._attachEventListeners();
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _attachEventListeners() {
    // Header click listener for toggle
    if (this._config.show_toggle) {
      const header = this.shadowRoot.querySelector('.card-header.clickable');
      if (header) {
        // Use a named function so we can remove it if needed
        const handleClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this._handleHeaderClick();
        };
        
        // Remove any existing listener and add new one
        header.removeEventListener('click', handleClick);
        header.addEventListener('click', handleClick);
        
        // Also handle touch for mobile
        header.addEventListener('touchstart', (e) => {
          e.stopPropagation();
        }, { passive: true });
      }
    }

    // Option click listeners using event delegation
    const optionsList = this.shadowRoot.querySelector('.options-list');
    if (optionsList) {
      const handleOptionClick = (e) => {
        const optionItem = e.target.closest('.option-item');
        if (optionItem && !optionItem.classList.contains('disabled')) {
          const option = optionItem.dataset.option;
          this._selectOption(option);
        }
      };
      
      optionsList.removeEventListener('click', handleOptionClick);
      optionsList.addEventListener('click', handleOptionClick);

      // Scroll listener
      const handleScroll = () => {
        if (!this._isUpdating) {
          this._scrollPosition = optionsList.scrollTop;
        }
      };
      
      optionsList.removeEventListener('scroll', handleScroll);
      optionsList.addEventListener('scroll', handleScroll, { passive: true });
    }
  }

  _handleHeaderClick() {
    if (!this._config.show_toggle) return;
    
    this._isOpen = !this._isOpen;
    if (this._isOpen) {
      this._scrollPosition = 0;
    }
    this._updateCard();
  }

  _scrollToSelected() {
    if (!this._config.scroll_to_selected) return;
    
    const container = this._getCachedElement('options-list');
    const selectedItem = this.shadowRoot.querySelector('.option-item.selected');
    
    if (container && selectedItem) {
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemHeight = selectedItem.clientHeight;
      
      const scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
      const maxScroll = container.scrollHeight - containerHeight;
      const targetScroll = Math.max(0, Math.min(scrollTop, maxScroll));
      
      container.scrollTop = targetScroll;
      this._scrollPosition = targetScroll;
    }
  }

  async _selectOption(option) {
    if (!this._hass || !this._config || this._isSelecting) return;
    
    const entity = this._hass.states[this._config.entity];
    if (!entity || entity.state === option) return;

    this._isSelecting = true;
    this._updateDisabledState(true);
    
    try {
      await this._hass.callService('input_select', 'select_option', {
        entity_id: this._config.entity,
        option: option
      });
    } catch (error) {
      console.error('Select List Card: Failed to select option:', error);
      this._showErrorFeedback(option);
      this._isSelecting = false;
      this._updateDisabledState(false);
    }
    
    setTimeout(() => {
      if (this._isSelecting) {
        this._isSelecting = false;
        this._updateDisabledState(false);
      }
    }, 2000);
  }

  _showErrorFeedback(option) {
    const optionElements = this.shadowRoot.querySelectorAll('.option-item');
    optionElements.forEach(el => {
      if (el.dataset.option === option) {
        el.style.backgroundColor = 'var(--error-color, #f44336)';
        el.style.color = 'white';
        setTimeout(() => {
          el.style.backgroundColor = '';
          el.style.color = '';
        }, 2000);
      }
    });
  }

  _updateDisabledState(disabled) {
    const optionElements = this.shadowRoot.querySelectorAll('.option-item');
    optionElements.forEach(el => {
      el.classList.toggle('disabled', disabled);
    });
  }

  getCardSize() {
    if (!this._config) return 1;
    
    let size = this._config.title ? 1 : 0;
    
    if (this._hass && this._config.entity) {
      const entity = this._hass.states[this._config.entity];
      if (entity?.attributes.options) {
        const optionsCount = entity.attributes.options.length;
        const maxOptions = this._config.max_options === 0 ? optionsCount : Math.min(this._config.max_options, optionsCount);
        size += maxOptions;
      }
    }
    
    return Math.max(size, 1);
  }

  disconnectedCallback() {
    clearTimeout(this._updateTimeout);
    this._domCache.clear();
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
