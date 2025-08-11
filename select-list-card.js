// Select List Card - Standalone Version
// No external dependencies required

console.info(
  `%c  SELECT-LIST-CARD  \n%c  Version 2.0.2     `,
  "color: orange; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: dimgray"
);

class SelectListCard extends HTMLElement {
  // Constants
  static get UPDATE_THROTTLE_MS() { return 50; }
  static get SELECTION_TIMEOUT_MS() { return 2000; }
  static get ERROR_FEEDBACK_DURATION_MS() { return 2000; }
  static get DEFAULT_ITEM_HEIGHT() { return 48; }

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
    this._styleSheet = null;
    
    // Bind methods once
    this._handleHeaderClick = this._handleHeaderClick.bind(this);
    this._handleScroll = this._handleScroll.bind(this);
    this._selectOption = this._selectOption.bind(this);
    
    // Create reusable style sheet
    this._createStyleSheet();
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

    // Validate max_options
    if (config.max_options !== undefined && (typeof config.max_options !== 'number' || config.max_options < 0)) {
      throw new Error('Invalid configuration: max_options must be a number >= 0');
    }

    // Validate scroll_behavior
    if (config.scroll_behavior && !['smooth', 'auto'].includes(config.scroll_behavior)) {
      throw new Error('Invalid configuration: scroll_behavior must be "smooth" or "auto"');
    }

    // Validate icon format (basic check)
    if (config.icon && typeof config.icon !== 'string') {
      console.warn('Select List Card: Icon should be a string');
    }

    // Set defaults
    this._config = {
      title: '',
      icon: '',
      show_toggle: false,
      truncate: true,
      scroll_to_selected: true,
      max_options: 5,
      scroll_behavior: 'smooth',
      ...config
    };

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
      return; // Skip update if nothing changed
    }
    
    // Update cached values
    this._lastEntityState = entity.state;
    this._lastOptions = entity.attributes.options;
    
    // Reset selection state if state changed externally
    if (stateChanged && this._isSelecting) {
      this._isSelecting = false;
    }
    
    // Throttle updates
    const now = performance.now();
    if (now - this._lastUpdateTime < SelectListCard.UPDATE_THROTTLE_MS) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = setTimeout(() => this._performUpdate(), SelectListCard.UPDATE_THROTTLE_MS);
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

  _createStyleSheet() {
    // Create styles as a template for reuse
    this._styleTemplate = (maxHeight, itemHeight) => `
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
        transition: transform 0.2s ease;
        color: var(--secondary-text-color, #666);
      }
      
      .toggle-icon.rotated {
        transform: rotate(180deg);
      }
      
      .options-container {
        overflow: hidden;
        transition: max-height 0.2s ease-in-out;
        max-height: ${this._isOpen ? maxHeight : 0}px;
      }
      
      .options-list {
        max-height: ${maxHeight}px;
        overflow-y: auto;
        overflow-x: hidden;
        scroll-behavior: var(--scroll-behavior, smooth);
        contain: layout style;
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
        contain: layout style;
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
    `;
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

    // Save scroll position before updating
    this._saveScrollPosition();
    this._isUpdating = true;
    
    // Check if we need a full re-render or just update existing elements
    const needsFullRender = this._needsFullRender(entity);
    
    if (needsFullRender) {
      this._renderCard(entity);
      this._domCache.clear(); // Only clear cache when we do full render
    } else {
      this._updateExistingElements(entity);
    }
    
    // Use requestAnimationFrame for DOM operations
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

  _needsFullRender(entity) {
    // Check if options changed (requires full re-render)
    const currentOptions = JSON.stringify(entity.attributes.options || []);
    const lastOptions = JSON.stringify(this._lastOptions || []);
    
    // Check if we don't have a rendered card yet
    const hasCard = this.shadowRoot?.querySelector('.card-container');
    
    return !hasCard || currentOptions !== lastOptions;
  }

  _updateExistingElements(entity) {
    const currentValue = entity.state;
    
    // Update selected state on existing options
    const optionElements = this.shadowRoot.querySelectorAll('.option-item');
    optionElements.forEach(el => {
      const isSelected = el.dataset.option === currentValue;
      el.classList.toggle('selected', isSelected);
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
    
    // Calculate dimensions
    const maxOptions = this._config.max_options === 0 ? options.length : Math.min(this._config.max_options, options.length);
    const itemHeight = SelectListCard.DEFAULT_ITEM_HEIGHT;
    const listMaxHeight = maxOptions * itemHeight;

    // Generate styles
    const styles = `<style>
      :host {
        --scroll-behavior: ${this._config.scroll_behavior};
      }
      ${this._styleTemplate(listMaxHeight, itemHeight)}
    </style>`;

    // Create header HTML (cached if title doesn't change)
    const headerHTML = this._config.title ? this._createHeaderHTML() : '';

    // Create options HTML using document fragment for better performance
    const optionsHTML = this._createOptionsHTML(options, currentValue);

    // Update DOM in one operation
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

    // Add event listeners
    this._attachEventListeners();
  }

  _createHeaderHTML() {
    const chevronDown = `<svg class="toggle-icon ${this._isOpen ? 'rotated' : ''}" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>`;
    const customIcon = this._config.icon ? `<svg class="header-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>` : '';

    return `
      <div class="card-header ${this._config.show_toggle ? 'clickable' : ''}">
        <div class="header-left">
          ${customIcon}
          <span>${this._config.title}</span>
        </div>
        ${this._config.show_toggle ? chevronDown : ''}
      </div>
    `;
  }

  _createOptionsHTML(options, currentValue) {
    if (options.length === 0) {
      return '<div class="no-options">No options available</div>';
    }

    // Use array join for better performance than string concatenation
    return options.map(option => {
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
    }).join('');
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _cleanup() {
    // Remove event listeners
    const header = this.shadowRoot?.querySelector('.card-header.clickable');
    if (header) {
      header.removeEventListener('click', this._handleHeaderClick);
    }
    
    const optionsList = this.shadowRoot?.querySelector('.options-list');
    if (optionsList) {
      optionsList.removeEventListener('scroll', this._handleScroll);
    }
  }

  _attachEventListeners() {
    // Clean up existing listeners first
    this._cleanup();
    
    // Header click listener
    const header = this.shadowRoot.querySelector('.card-header.clickable');
    if (header) {
      header.addEventListener('click', this._handleHeaderClick);
    }

    // Option click listeners using event delegation
    const optionsList = this.shadowRoot.querySelector('.options-list');
    if (optionsList) {
      optionsList.addEventListener('click', (e) => {
        const optionItem = e.target.closest('.option-item');
        if (optionItem && !optionItem.classList.contains('disabled')) {
          const option = optionItem.dataset.option;
          this._selectOption(option);
        }
      });

      // Scroll listener with passive flag for better performance
      optionsList.addEventListener('scroll', this._handleScroll, { passive: true });
    }
  }

  _handleScroll() {
    if (!this._isUpdating) {
      this._scrollPosition = this._getCachedElement('options-list')?.scrollTop || 0;
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
      
      // Calculate scroll position to center the selected item
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
    
    // Failsafe timeout
    setTimeout(() => {
      if (this._isSelecting) {
        this._isSelecting = false;
        this._updateDisabledState(false);
      }
    }, SelectListCard.SELECTION_TIMEOUT_MS);
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
        }, SelectListCard.ERROR_FEEDBACK_DURATION_MS);
      }
    });
  }

  _updateDisabledState(disabled) {
    // Use cached selector or query once
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

  // Cleanup method for better memory management
  disconnectedCallback() {
    clearTimeout(this._updateTimeout);
    this._domCache.clear();
    this._cleanup();
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
