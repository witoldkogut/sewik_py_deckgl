const { DeckGL, GeoJsonLayer, TileLayer, BitmapLayer } = deck;

class AccidentVisualization {
  constructor() {
    this.deckgl = null;
    this.currentData = null;
    this.metadata = null;
    this.fileIndex = null;
    
    // Cache for loaded GeoJSON files
    this.geoJsonCache = new Map();
    
    // Selection state
    this.selectedYears = new Set();
    this.selectedVoivodeships = new Set();
    
    // Persistent tooltip state
    this.persistentTooltip = null;
    this.selectedFeature = null;
    this.selectedFeatureId = null; // Track selected feature ID
    
    // Current language
    this.currentLanguage = 'pl';
    
    // Severity visibility state
    this.severityVisibility = {
      'Fatal': true,
      'Serious': true,
      'Slight': true,
      'DamageOnly': true
    };
    
    // Translations
    this.translations = {
      en: {
        title: 'Road Accidents - Poland',
        languageLabel: 'Language / Język:',
        mapStyleLabel: 'Map Style:',
        yearsLabel: 'Years:',
        voivodeshipsLabel: 'Voivodeships:',
        showAll: 'Show All',
        clearAll: 'Clear All',
        pointSize: 'Point Size:',
        opacity: 'Opacity:',
        noDataLoaded: 'No data loaded',
        selection: 'Selection:',
        years: 'Years:',
        voivodeships: 'Voivodeships:',
        totalAccidents: 'Total Accidents:',
        displayed: 'Displayed:',
        severity: 'Severity:',
        damageOnly: 'Damage Only',
        slight: 'Slight',
        serious: 'Serious',
        fatal: 'Fatal',
        loadingData: 'Loading data...',
        accidentDetails: 'Accident Details',
        year: 'Year:',
        voivodeship: 'Voivodeship:',
        city: 'City:',
        fatalities: 'Fatalities:',
        injuries: 'Injuries:',
        unknown: 'Unknown',
        accidentId: 'Accident ID:',
        date: 'Date:',
        casualties: 'Casualties:',
        fatal: 'Fatal',
        serious: 'Serious',
        slight: 'Slight',
        other: 'Damage Only',
        viewInSewik: 'View in SEWIK Database',
        clickToPin: 'Click to pin tooltip',
        showCategory: 'Show',
        hideCategory: 'Hide',
        severityControls: 'Severity Controls:',
        allVisible: 'All Visible',
        allHidden: 'All Hidden'
      },
      pl: {
        title: 'Wypadki Drogowe w Polsce',
        languageLabel: 'Język / Language:',
        mapStyleLabel: 'Styl Mapy:',
        yearsLabel: 'Lata:',
        voivodeshipsLabel: 'Województwa:',
        showAll: 'Pokaż Wszystkie',
        clearAll: 'Wyczyść Wszystkie',
        pointSize: 'Rozmiar Punktu:',
        opacity: 'Przezroczystość:',
        noDataLoaded: 'Brak załadowanych danych',
        selection: 'Wybór:',
        years: 'Lata:',
        voivodeships: 'Województwa:',
        totalAccidents: 'Łączna Liczba Wypadków:',
        displayed: 'Wyświetlone:',
        severity: 'Ofiary:',
        damageOnly: 'Bez ofiar',
        slight: 'Lekko ranne',
        serious: 'Ciężko ranne',
        fatal: 'Śmiertelne',
        loadingData: 'Ładowanie danych...',
        accidentDetails: 'Szczegóły Wypadku',
        year: 'Rok:',
        voivodeship: 'Województwo:',
        city: 'Miasto:',
        fatalities: 'Ofiary Śmiertelne:',
        injuries: 'Ranni:',
        unknown: 'Nieznane',
        accidentId: 'ID Wypadku:',
        date: 'Data:',
        casualties: 'Ofiary:',
        fatal: 'Śmiertelne',
        serious: 'Ciężko ranni',
        slight: 'Lekko ranni',
        other: 'Bez obrażeń',
        viewInSewik: 'Zobacz w bazie SEWIK',
        clickToPin: 'Kliknij aby przypiąć',
        showCategory: 'Pokaż',
        hideCategory: 'Ukryj',
        severityControls: 'Kategorie wypadków:',
        allVisible: 'Wszystkie Widoczne',
        allHidden: 'Wszystkie Ukryte'
      }
    };
    
    // Pre-defined years and voivodeships
    this.years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
    this.voivodeships = [
      'DOLNOŚLĄSKIE',
      'KUJAWSKO-POMORSKIE',
      'LUBELSKIE',
      'LUBUSKIE',
      'ŁÓDZKIE',
      'MAŁOPOLSKIE',
      'MAZOWIECKIE',
      'OPOLSKIE',
      'PODKARPACKIE',
      'PODLASKIE',
      'POMORSKIE',
      'ŚLĄSKIE',
      'ŚWIĘTOKRZYSKIE',
      'WARMIŃSKO-MAZURSKIE',
      'WIELKOPOLSKIE',
      'ZACHODNIOPOMORSKIE'
    ];
    
    // Available map styles
    this.mapStyles = {
      'openstreetmap': {
        name: 'OpenStreetMap',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: 'Dane: <a href="sewik.pl">System Ewidencji Wypadków i Kolizji</a> <br>© OpenStreetMap contributors',
        bodyColor: '#f0f0f0',
        mapDependentBorderColorSelected:  'rgba(0, 0, 0, 1)',
        mapDependentBorderColor:  'rgba(70, 70, 70, 1)',
      },
      'satellite': {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Dane: <a href="sewik.pl">System Ewidencji Wypadków i Kolizji</a> <br>Esri, Maxar, GeoEye, Earthstar Geographics',
        bodyColor: '#1a1a1a',
        mapDependentBorderColorSelected:  'rgba(255, 255, 255, 1)',
        mapDependentBorderColor:  'rgba(167, 167, 167, 1)',
      },
      'cartodb-light': {
        name: 'CartoDB Light',
        url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
        attribution: 'Dane: <a href="sewik.pl">System Ewidencji Wypadków i Kolizji</a> <br>© OpenStreetMap contributors © CARTO',
        bodyColor: '#f5f5f5',
        mapDependentBorderColorSelected:  'rgba(0, 0, 0, 1)',
        mapDependentBorderColor:  'rgba(70, 70, 70, 1)',
      },
      'cartodb-dark': {
        name: 'CartoDB Dark',
        url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
        attribution: 'Dane: <a href="sewik.pl">System Ewidencji Wypadków i Kolizji</a> <br>© OpenStreetMap contributors © CARTO',
        bodyColor: 'rgba(44, 44, 44, 1)',
        mapDependentBorderColorSelected:  'rgba(255, 255, 255, 1)',
        mapDependentBorderColor:  'rgba(167, 167, 167, 1)',
      }
    };
    
    this.currentMapStyle = 'cartodb-light';
    
    // Severity mapping
    this.severityMapping = {
      0: 'DamageOnly',
      1: 'Slight', 
      2: 'Serious',
      3: 'Fatal'
    };
    
    // UI state
    this.controlPanelVisible = true;
    
    this.init();
  }
  
  async init() {
    try {
      // Initialize deck.gl first
      this.initDeckGL();
      
      // Setup controls with pre-defined data
      this.setupControls();
      
      // Set default selections (last year and first voivodeship)
      this.setDefaultSelections();
      
      // Try to load metadata and file index (optional)
      await this.loadMetadata();
      
      // Load initial data
      await this.loadData();
      
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  }
  
  setDefaultSelections() {
    // Select the last year by default
    if (this.years.length > 0) {
      const lastYear = Math.max(...this.years);
      this.selectedYears.add(lastYear);
    }
    
    // Select the first voivodeship by default
    if (this.voivodeships.length > 0) {
      this.selectedVoivodeships.add(this.voivodeships[0]);
    }
    
    this.updateButtonStates();
  }
  
  async loadMetadata() {
    try {
      const [metadataResponse, indexResponse] = await Promise.all([
        fetch('metadata.json'),
        fetch('data/file_index.json')
      ]);
      
      this.metadata = await metadataResponse.json();
      this.fileIndex = await indexResponse.json();
      
      console.log('Loaded metadata:', this.metadata);
      console.log('Loaded file index:', this.fileIndex.length, 'files');
      
      // Update with actual data if different from pre-defined
      if (this.metadata.years && this.metadata.years.length > 0) {
        this.years = this.metadata.years.sort((a, b) => b - a);
        this.createYearButtons();
        this.setDefaultSelections(); // Reset defaults with new data
      }
      
      if (this.metadata.voivodeships && this.metadata.voivodeships.length > 0) {
        this.voivodeships = this.metadata.voivodeships.sort();
        this.createVoivodeshipButtons();
        this.setDefaultSelections(); // Reset defaults with new data
      }
      
    } catch (error) {
      console.warn('Failed to load metadata, using pre-defined values:', error);
      this.metadata = {
        years: this.years,
        voivodeships: this.voivodeships
      };
      this.fileIndex = [];
    }
  }
  
  initDeckGL() {
    this.deckgl = new DeckGL({
      container: 'map',
      initialViewState: {
        longitude: 19.5, // Center of Poland
        latitude: 52.0,
        zoom: 7,
        maxZoom: 18,
        pitch: 0,
        bearing: 0
      },
      controller: true,
      getTooltip: this.getTooltip.bind(this),
      onClick: this.onClick.bind(this),
      layers: this.createLayers()
    });
  }
  
  createTileLayer() {
    const style = this.mapStyles[this.currentMapStyle];
    
    return new TileLayer({
      id: 'tile-layer',
      data: style.url,
      minZoom: 0,
      maxZoom: 19,
      tileSize: 256,
      
      renderSubLayers: props => {
        const { tile } = props;
        const { x, y, z } = tile.index;
        const { west, south, east, north } = tile.bbox;
        
        // Create the tile URL
        const tileUrl = style.url
          .replace('{x}', x)
          .replace('{y}', y)
          .replace('{z}', z);
        
        return new BitmapLayer(props, {
          data: null,
          image: tileUrl,
          bounds: [west, south, east, north],
          // Add fade-in animation
          opacity: tile.isLoaded ? 1 : 0,
          transitions: {
            opacity: {
              duration: 300,
              easing: t => t * t * (3.0 - 2.0 * t) // smoothstep easing
            }
          }
        });
      },
      
      onTileError: (tile, error) => {
        console.warn('Tile error:', tile.index, error);
      }
    });
  }
  
  createLayers() {
    const layers = [this.createTileLayer()];
    
    // Define map-dependent border colors based on current map style
    const currentStyle = this.mapStyles[this.currentMapStyle];
    const mapDependentBorderColorSelected = currentStyle.mapDependentBorderColorSelected;
    const mapDependentBorderColor = currentStyle.mapDependentBorderColor;
    
    if (this.currentData && this.currentData.features.length > 0) {
      const radius = parseInt(document.getElementById('radius-slider')?.value || '5');
      const opacity = parseFloat(document.getElementById('opacity-slider')?.value || '0.6');
      
      // Filter features based on severity visibility
      const visibleFeatures = this.currentData.features.filter(feature => {
        const severity = this.getSeverityFromFeature(feature);
        return this.severityVisibility[severity];
      });
      
      const filteredData = {
        type: 'FeatureCollection',
        features: visibleFeatures
      };
      
      const accidentLayer = new GeoJsonLayer({
        id: 'accidents',
        data: filteredData,
        pointType: 'circle',
        getPointRadius: radius,
        getFillColor: d => d.properties.color || [255, 0, 0, 160],
        getLineColor: d => {
          // Highlight selected feature with thick black border
          const featureId = this.getFeatureId(d);
          if (this.selectedFeatureId && featureId === this.selectedFeatureId) {
            return mapDependentBorderColorSelected; // Selected border color
          }
          return mapDependentBorderColor; // Default border color
        },
        getLineWidth: d => {
          // Thicker border for selected feature
          const featureId = this.getFeatureId(d);
          if (this.selectedFeatureId && featureId === this.selectedFeatureId) {
            return 3; // Thick border for selected
          }
          return 1; // Default border width
        },
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 3,
        opacity: opacity,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 200]
      });
      
      layers.push(accidentLayer);
    }
    
    return layers;
  }
  
  setupControls() {
    // Create year and voivodeship buttons
    this.createYearButtons();
    this.createVoivodeshipButtons();
    
    // Create severity control buttons
    this.createSeverityControls();
    
    // Populate map style dropdown
    this.updateMapStyleDropdown();
    
    // Add event listeners with null checks
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.currentLanguage = e.target.value;
        this.updateLanguage();
      });
    }
    
    const mapStyleSelect = document.getElementById('map-style-select');
    if (mapStyleSelect) {
      mapStyleSelect.addEventListener('change', (e) => {
        this.currentMapStyle = e.target.value;
        this.updateMapAttribution();
        this.updateBodyColor();
        this.updateLayers();
      });
    }
    
    // Radius slider - add both 'input' and 'change' events for real-time updates
    const radiusSlider = document.getElementById('radius-slider');
    if (radiusSlider) {
      const updateRadius = (e) => {
        this.updateLayers();
      };
      radiusSlider.addEventListener('input', updateRadius); // Real-time while dragging
      radiusSlider.addEventListener('change', updateRadius); // When released
    }
    
    // Opacity slider - add both 'input' and 'change' events for real-time updates
    const opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) {
      const updateOpacity = (e) => {
        this.updateLayers();
      };
      opacitySlider.addEventListener('input', updateOpacity); // Real-time while dragging
      opacitySlider.addEventListener('change', updateOpacity); // When released
    }
    
    // Initialize language
    this.updateLanguage();
  }
  
  createYearButtons() {
    const container = document.getElementById('year-buttons');
    if (!container) {
      console.warn('Year buttons container not found');
      return;
    }
    
    container.innerHTML = '';
    
    this.years.forEach(year => {
      const button = document.createElement('button');
      button.className = 'selection-button';
      button.textContent = year;
      button.onclick = () => this.toggleYear(year);
      container.appendChild(button);
    });
  }
  
  createVoivodeshipButtons() {
    const container = document.getElementById('voivodeship-buttons');
    if (!container) {
      console.warn('Voivodeship buttons container not found');
      return;
    }
    
    container.innerHTML = '';
    
    this.voivodeships.forEach(voivodeship => {
      const button = document.createElement('button');
      button.className = 'selection-button';
      button.textContent = voivodeship;
      button.title = voivodeship; // Full name on hover
      button.onclick = () => this.toggleVoivodeship(voivodeship);
      container.appendChild(button);
    });
  }
  
  createSeverityControls() {
    const container = document.getElementById('severity-controls');
    if (!container) {
      console.warn('Severity controls container not found');
      return;
    }
    
    container.innerHTML = '';
    
    const severityOrder = ['Fatal', 'Serious', 'Slight', 'DamageOnly'];
    const severityColors = {
      'Fatal': 'rgb(139, 0, 0)',
      'Serious': 'rgb(255, 136, 0)',
      'Slight': 'rgb(255, 204, 0)',
      'DamageOnly': 'rgb(128, 128, 128)'
    };
    
    severityOrder.forEach(severity => {
      const controlDiv = document.createElement('div');
      controlDiv.className = 'severity-control';
      controlDiv.style.cssText = 'display: flex; align-items: center; margin: 5px 0; padding: 5px; border-radius: 4px; background: rgba(255,255,255,0.1);';
      
      const colorIndicator = document.createElement('div');
      colorIndicator.style.cssText = `
        width: 16px;
        height: 16px;
        background-color: ${severityColors[severity]};
        margin-right: 8px;
        border-radius: 50%;
        border: 2px solid white;
      `;
      
      const label = document.createElement('span');
      label.style.cssText = 'flex: 1; margin-right: 8px; font-size: 12px;';
      label.textContent = this.getSeverityDisplayName(severity);
      label.id = `severity-label-${severity}`;
      
      const countSpan = document.createElement('span');
      countSpan.style.cssText = 'margin-right: 8px; font-size: 11px; color: #ccc; min-width: 40px; text-align: right;';
      countSpan.textContent = '0';
      countSpan.id = `severity-count-${severity}`;
      
      const button = document.createElement('button');
      button.className = 'severity-toggle-button';
      button.style.cssText = `
        padding: 2px 8px;
        font-size: 10px;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        min-width: 50px;
      `;
      
      button.onclick = () => this.toggleSeverityVisibility(severity);
      button.id = `severity-button-${severity}`;
      
      controlDiv.appendChild(colorIndicator);
      controlDiv.appendChild(label);
      controlDiv.appendChild(countSpan);
      controlDiv.appendChild(button);
      container.appendChild(controlDiv);
    });
    
    this.updateSeverityButtonStates();
  }
  
  toggleYear(year) {
    if (this.selectedYears.has(year)) {
      this.selectedYears.delete(year);
    } else {
      this.selectedYears.add(year);
    }
    this.updateButtonStates();
    this.loadData();
  }
  
  toggleVoivodeship(voivodeship) {
    if (this.selectedVoivodeships.has(voivodeship)) {
      this.selectedVoivodeships.delete(voivodeship);
    } else {
      this.selectedVoivodeships.add(voivodeship);
    }
    this.updateButtonStates();
    this.loadData();
  }
  
  toggleSeverityVisibility(severity) {
    this.severityVisibility[severity] = !this.severityVisibility[severity];
    this.updateSeverityButtonStates();
    this.updateLayers();
  }
  
  clearYearSelection() {
    this.selectedYears.clear();
    this.updateButtonStates();
    this.loadData();
  }
  
  clearVoivodeshipSelection() {
    this.selectedVoivodeships.clear();
    this.updateButtonStates();
    this.loadData();
  }
  
  showAllYears() {
    this.selectedYears.clear();
    this.years.forEach(year => this.selectedYears.add(year));
    this.updateButtonStates();
    this.loadData();
  }
  
  showAllVoivodeships() {
    this.selectedVoivodeships.clear();
    this.voivodeships.forEach(voivodeship => this.selectedVoivodeships.add(voivodeship));
    this.updateButtonStates();
    this.loadData();
  }
  
  showAllSeverities() {
    Object.keys(this.severityVisibility).forEach(severity => {
      this.severityVisibility[severity] = true;
    });
    this.updateSeverityButtonStates();
    this.updateLayers();
  }
  
  hideAllSeverities() {
    Object.keys(this.severityVisibility).forEach(severity => {
      this.severityVisibility[severity] = false;
    });
    this.updateSeverityButtonStates();
    this.updateLayers();
  }
  
  updateButtonStates() {
    // Update year buttons
    const yearButtons = document.querySelectorAll('#year-buttons .selection-button');
    yearButtons.forEach(button => {
      const year = parseInt(button.textContent);
      if (this.selectedYears.has(year)) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });
    
    // Update voivodeship buttons
    const voivodeshipButtons = document.querySelectorAll('#voivodeship-buttons .selection-button');
    voivodeshipButtons.forEach(button => {
      const voivodeship = button.textContent;
      if (this.selectedVoivodeships.has(voivodeship)) {
        button.classList.add('selected');
      } else {
        button.classList.remove('selected');
      }
    });
  }
  
  updateSeverityButtonStates() {
    const t = this.translations[this.currentLanguage];
    
    // Calculate current severity counts
    const severityCounts = { DamageOnly: 0, Slight: 0, Serious: 0, Fatal: 0 };
    if (this.currentData && this.currentData.features) {
      this.currentData.features.forEach(feature => {
        const severity = this.getSeverityFromFeature(feature);
        if (severityCounts.hasOwnProperty(severity)) {
          severityCounts[severity]++;
        }
      });
    }
    
    Object.keys(this.severityVisibility).forEach(severity => {
      const button = document.getElementById(`severity-button-${severity}`);
      const label = document.getElementById(`severity-label-${severity}`);
      const countSpan = document.getElementById(`severity-count-${severity}`);
      
      if (button && label) {
        const isVisible = this.severityVisibility[severity];
        
        button.textContent = isVisible ? t.hideCategory : t.showCategory;
        button.style.backgroundColor = isVisible ? '#ff4444' : '#4CAF50';
        button.style.color = 'white';
        
        // Update label text with current language
        label.textContent = this.getSeverityDisplayName(severity);
        
        // Update count
        if (countSpan) {
          const count = severityCounts[severity] || 0;
          countSpan.textContent = `${count.toLocaleString()}`;
          countSpan.style.color = '#000000ff';
        }
        
        // Update visual state
        const controlDiv = button.parentElement;
        controlDiv.style.opacity = isVisible ? '1' : '0.5';
      }
    });
  }
  
  updateMapStyleDropdown() {
    const mapStyleSelect = document.getElementById('map-style-select');
    if (!mapStyleSelect) {
      console.warn('Map style select not found');
      return;
    }
    
    mapStyleSelect.innerHTML = '';
    
    Object.entries(this.mapStyles).forEach(([key, style]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = style.name;
      mapStyleSelect.appendChild(option);
    });
    
    mapStyleSelect.value = this.currentMapStyle;
    this.updateMapAttribution();
    this.updateBodyColor();
  }
  
  updateMapAttribution() {
    const attributionElement = document.getElementById('map-attribution');
    const currentStyle = this.mapStyles[this.currentMapStyle];
    
    if (attributionElement && currentStyle) {
      attributionElement.innerHTML = currentStyle.attribution;
    }
  }

  updateBodyColor() {
    const currentStyle = this.mapStyles[this.currentMapStyle];
    if (currentStyle && currentStyle.bodyColor) {
      document.body.style.backgroundColor = currentStyle.bodyColor;
    }
  }
  
  toggleControlPanel() {
    this.controlPanelVisible = !this.controlPanelVisible;
    const panel = document.getElementById('control-panel');
    const toggleButton = document.getElementById('toggle-button');
    
    if (!panel || !toggleButton) {
      console.warn('Control panel or toggle button not found');
      return;
    }
    
    if (this.controlPanelVisible) {
      panel.classList.remove('hidden');
      toggleButton.classList.remove('panel-hidden');
      toggleButton.innerHTML = '☰';
    } else {
      panel.classList.add('hidden');
      toggleButton.classList.add('panel-hidden');
      toggleButton.innerHTML = '→';
    }
  }
  
  async loadData() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'block';
    }
    
    try {
      const selectedYears = Array.from(this.selectedYears);
      const selectedVoivodeships = Array.from(this.selectedVoivodeships);
      
      console.log(`Loading data for years: [${selectedYears.join(', ')}], voivodeships: [${selectedVoivodeships.join(', ')}]`);
      
      if (selectedYears.length === 0 || selectedVoivodeships.length === 0) {
        this.currentData = { type: 'FeatureCollection', features: [] };
        this.updateLayers();
        this.updateStats(0, {});
        if (loading) {
          loading.innerHTML = 'Loading data...';
        }
        return;
      }
      
      // Generate files to load
      let filesToLoad = [];
      
      if (this.fileIndex && this.fileIndex.length > 0) {
        filesToLoad = this.fileIndex.filter(file => 
          selectedYears.includes(file.year) && 
          selectedVoivodeships.includes(file.voivodeship)
        );
      } else {
        // Generate expected filenames
        for (const voivodeship of selectedVoivodeships) {
          for (const year of selectedYears) {
            const filename = `accidents_${year}_${voivodeship}.geojson`;
            filesToLoad.push({
              filename: filename,
              year: year,
              voivodeship: voivodeship
            });
          }
        }
      }
      
      console.log(`Attempting to load ${filesToLoad.length} files...`);
      
      // Load and combine GeoJSON files
      const features = [];
      let totalAccidents = 0;
      const severityCounts = { DamageOnly: 0, Slight: 0, Serious: 0, Fatal: 0 };
      let successfulLoads = 0;
      
      // Process all files (no limit)
      for (let i = 0; i < filesToLoad.length; i++) {
        const fileInfo = filesToLoad[i];
        
        // Update loading progress
        if (loading) {
          loading.innerHTML = `Loading file ${i + 1}/${filesToLoad.length}...<br>${fileInfo.filename}`;
        }
        
        try {
          // Check cache first
          if (this.geoJsonCache.has(fileInfo.filename)) {
            console.log(`Using cached data for ${fileInfo.filename}`);
            const geojson = this.geoJsonCache.get(fileInfo.filename);
            
            if (geojson.features && geojson.features.length > 0) {
              features.push(...geojson.features);
              successfulLoads++;
              
              // Count accidents and severity
              geojson.features.forEach(feature => {
                totalAccidents++;
                const severity = this.getSeverityFromFeature(feature);
                if (severityCounts.hasOwnProperty(severity)) {
                  severityCounts[severity]++;
                }
              });
            }
            continue;
          }
          
          const response = await fetch(`data/${fileInfo.filename}`);
          
          if (!response.ok) {
            console.warn(`File not found: ${fileInfo.filename}`);
            continue;
          }
          
          const geojson = await response.json();
          
          // Cache the loaded data
          this.geoJsonCache.set(fileInfo.filename, geojson);
          
          if (geojson.features && geojson.features.length > 0) {
            features.push(...geojson.features);
            successfulLoads++;
            
            // Count accidents and severity
            geojson.features.forEach(feature => {
              totalAccidents++;
              const severity = this.getSeverityFromFeature(feature);
              if (severityCounts.hasOwnProperty(severity)) {
                severityCounts[severity]++;
              }
            });
          }
          
        } catch (error) {
          console.warn(`Failed to load ${fileInfo.filename}:`, error);
        }
      }
      
      this.currentData = {
        type: 'FeatureCollection',
        features: features
      };
      
      console.log(`Successfully loaded ${successfulLoads} files with ${features.length} accident points`);
      
      this.updateLayers();
      this.updateStats(totalAccidents, severityCounts);
      
    } catch (error) {
      console.error('Failed to load data:', error);
      this.updateStats(0, {});
    } finally {
      if (loading) {
        loading.style.display = 'none';
        loading.innerHTML = 'Loading data...';
      }
    }
  }
  
  updateLayers() {
    this.deckgl.setProps({ layers: this.createLayers() });
    // Update severity counts when layers change
    this.updateSeverityButtonStates();
  }
  
  updateLanguage() {
    const t = this.translations[this.currentLanguage];
    
    // Update main UI elements with null checks
    const title = document.getElementById('title');
    if (title) title.textContent = t.title;
    
    const languageLabel = document.getElementById('language-label');
    if (languageLabel) languageLabel.textContent = t.languageLabel;
    
    const mapStyleLabel = document.getElementById('map-style-label');
    if (mapStyleLabel) mapStyleLabel.textContent = t.mapStyleLabel;
    
    const yearsLabel = document.getElementById('years-label');
    if (yearsLabel) {
      yearsLabel.innerHTML = `
        ${t.yearsLabel}
        <button class="show-button" onclick="app.showAllYears()" id="show-all-years">${t.showAll}</button>
        <button class="clear-button" onclick="app.clearYearSelection()" id="clear-all-years">${t.clearAll}</button>
      `;
    }
    
    const voivodeshipsLabel = document.getElementById('voivodeships-label');
    if (voivodeshipsLabel) {
      voivodeshipsLabel.innerHTML = `
        ${t.voivodeshipsLabel}
        <button class="show-button" onclick="app.showAllVoivodeships()" id="show-all-voivodeships">${t.showAll}</button>
        <button class="clear-button" onclick="app.clearVoivodeshipSelection()" id="clear-all-voivodeships">${t.clearAll}</button>
      `;
    }
    
    // Update severity controls label
    const severityControlsLabel = document.getElementById('severity-controls-label');
    if (severityControlsLabel) {
      severityControlsLabel.innerHTML = `
        ${t.severityControls}
        <button class="show-button" onclick="app.showAllSeverities()" style="margin-left: 10px; font-size: 10px; padding: 2px 6px;">${t.showAll}</button>
        <button class="clear-button" onclick="app.hideAllSeverities()" style="font-size: 10px; padding: 2px 6px;">${t.clearAll}</button>
      `;
    }
    
    // Update slider labels
    const radiusLabel = document.getElementById('radius-label');
    if (radiusLabel) radiusLabel.textContent = t.pointSize + ':';
    
    const opacityLabel = document.getElementById('opacity-label');
    if (opacityLabel) opacityLabel.textContent = t.opacity + ':';
    
    // Update legend items with consistent naming
    const severityLegend = document.getElementById('severity-legend');
    if (severityLegend) severityLegend.textContent = t.severity;
    
    const damageOnlyLegend = document.getElementById('damage-only-legend');
    if (damageOnlyLegend) damageOnlyLegend.textContent = t.damageOnly;
    
    const slightLegend = document.getElementById('slight-legend');
    if (slightLegend) slightLegend.textContent = t.slight;
    
    const seriousLegend = document.getElementById('serious-legend');
    if (seriousLegend) seriousLegend.textContent = t.serious;
    
    const fatalLegend = document.getElementById('fatal-legend');
    if (fatalLegend) fatalLegend.textContent = t.fatal;
    
    // Update loading text
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      if (loadingElement.innerHTML === 'Loading data...' || loadingElement.innerHTML.includes('Loading')) {
        loadingElement.innerHTML = t.loadingData;
      }
    }
    
    // Update severity control buttons
    this.updateSeverityButtonStates();
    
    // Refresh stats with current language
    this.updateStatsDisplay();
  }
  
  updateStatsDisplay() {
    // Re-calculate stats to update language
    if (this.currentData) {
      const severityCounts = { DamageOnly: 0, Slight: 0, Serious: 0, Fatal: 0 };
      let totalAccidents = 0;
      
      this.currentData.features.forEach(feature => {
        totalAccidents++;
        const severity = this.getSeverityFromFeature(feature);
        if (severityCounts.hasOwnProperty(severity)) {
          severityCounts[severity]++;
        }
      });
      
      this.updateStats(totalAccidents, severityCounts);
    } else {
      const stats = document.getElementById('stats');
      if (stats) {
        const t = this.translations[this.currentLanguage];
        stats.textContent = t.noDataLoaded;
      }
    }
  }

  updateStats(totalAccidents, severityCounts) {
    const stats = document.getElementById('stats');
    if (!stats) {
      console.warn('Stats element not found');
      return;
    }
    
    const t = this.translations[this.currentLanguage];
    
    // Calculate visible accidents based on severity visibility
    let visibleAccidents = 0;
    const visibleSeverityCounts = {};
    
    Object.keys(severityCounts).forEach(severity => {
      if (this.severityVisibility[severity]) {
        visibleAccidents += severityCounts[severity];
        visibleSeverityCounts[severity] = severityCounts[severity];
      } else {
        visibleSeverityCounts[severity] = 0;
      }
    });
    
    const selectedYears = Array.from(this.selectedYears).sort();
    const selectedVoivodeships = Array.from(this.selectedVoivodeships);
    
    stats.innerHTML = `
      <strong>${t.selection}</strong><br>
      ${t.years} ${selectedYears.length > 0 ? selectedYears.join(', ') : t.unknown}<br>
      ${t.voivodeships} ${selectedVoivodeships.length}<br><br>
      <strong>${t.totalAccidents}</strong> ${totalAccidents.toLocaleString()}<br>
      <strong>${t.displayed}</strong> ${visibleAccidents.toLocaleString()}<br>
    `;
  }
  
  getTooltip({ object }) {
    if (!object || this.persistentTooltip) return null; // Don't show hover tooltip if persistent is active
    
    const props = object.properties;
    const t = this.translations[this.currentLanguage];
    const severity = this.getSeverityFromFeature(object);
    const severityName = this.getSeverityDisplayName(severity);
    const accidentId = props.ID || props.id || t.unknown;

    return {
      html: `
        <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; font-size: 12px;">
          <div><strong>${t.accidentId}</strong> ${accidentId}</div>
        <div><strong>${t.severity}</strong> ${severityName}</div>
          <strong>${t.year}</strong> ${props.year || t.unknown}<br>
          <strong>${t.voivodeship}</strong> ${props.WOJ || t.unknown}<br>
          ${props.city ? `<strong>${t.city}</strong> ${props.city}<br>` : ''}
          <div style="font-size: 10px; color: #ccc; margin-top: 4px;">${t.clickToPin}</div>
        </div>
      `,
      style: {
        backgroundColor: 'transparent',
        fontSize: '12px'
      }
    };
  }
  
  onClick(info) {
    if (info.object) {
      this.selectedFeature = info.object;
      this.selectedFeatureId = this.getFeatureId(info.object);
      this.showPersistentTooltip(info);
      this.updateLayers(); // Refresh layers to show selection highlight
    } else {
      this.hidePersistentTooltip();
    }
  }
  onViewStateChange(viewState) {
    // Hide persistent tooltip when map view changes (zoom, pan, etc.)
    this.hidePersistentTooltip();
    return viewState;
  }  
  showPersistentTooltip(info) {
    this.hidePersistentTooltip(); // Remove any existing tooltip
    
    const props = info.object.properties;
    const t = this.translations[this.currentLanguage];
    const severity = this.getSeverityFromFeature(info.object);
    const severityName = this.getSeverityDisplayName(severity);
    
    // Create persistent tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'persistent-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      pointer-events: auto;
      left: ${info.x + 10}px;
      top: ${info.y + 10}px;
    `;
    
    // Format date if available
    let dateStr = t.unknown;
    if (props.date || props.DATA_ZDARZENIA) {
      const dateValue = props.date || props.DATA_ZDARZENIA;
      try {
        const date = new Date(dateValue);
        dateStr = date.toLocaleDateString();
      } catch (e) {
        dateStr = dateValue;
      }
    }
    
    // Get casualty counts - check multiple possible property names
    const fatal = props[3] || props.fatal || props.ZM || 0;
    const serious = props[2] || props.serious || props.ZC || 0;
    const slight = props[1] || props.slight || props.RL || 0;
    const other = props[0] || props.other || props.RC || 0;
    
    const accidentId = props.ID || props.id || t.unknown;
    
    tooltip.innerHTML = `
      <div style="margin-bottom: 8px;">
        <strong>${t.accidentDetails}</strong>
        <button onclick="app.hidePersistentTooltip()" 
                style="float: right; background: #ff4444; color: white; border: none; 
                       border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px;">×</button>
      </div>
      <div><strong>${t.accidentId}</strong> ${accidentId}</div>
      <div><strong>${t.date}</strong> ${dateStr}</div>
      <div><strong>${t.severity}</strong> ${severityName}</div>
      <div><strong>${t.year}</strong> ${props.year || t.unknown}</div>
      <div><strong>${t.voivodeship}</strong> ${props.WOJ || t.unknown}</div>
      ${props.city || props.MIEJSCOWOSC ? `<div><strong>${t.city}</strong> ${props.city || props.MIEJSCOWOSC}</div>` : ''}
      <div style="margin-top: 8px;"><strong>${t.casualties}</strong></div>
      <div style="margin-left: 10px;">
        ${t.fatal}: <span style="color: #ff4444;">${fatal}</span><br>
        ${t.serious}: <span style="color: #ff8800;">${serious}</span><br>
        ${t.slight}: <span style="color: #ffcc00;">${slight}</span><br>
        ${t.other}: <span style="color: #cccccc;">${other}</span>
      </div>
      ${accidentId !== t.unknown ? `
        <div style="margin-top: 10px;">
          <a href="https://sewik.pl/zdarzenie/${accidentId}" 
             target="_blank" 
             style="color: #4CAF50; text-decoration: none; font-weight: bold;">
            ${t.viewInSewik} ↗
          </a>
        </div>
      ` : ''}
    `;
    
    document.body.appendChild(tooltip);
    this.persistentTooltip = tooltip;
    
    // Adjust position if tooltip goes off screen
    setTimeout(() => {
      const rect = tooltip.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      if (rect.right > windowWidth) {
        tooltip.style.left = (info.x - rect.width - 10) + 'px';
      }
      if (rect.bottom > windowHeight) {
        tooltip.style.top = (info.y - rect.height - 10) + 'px';
      }
    }, 0);
  }
  
  hidePersistentTooltip() {
    if (this.persistentTooltip) {
      this.persistentTooltip.remove();
      this.persistentTooltip = null;
      this.selectedFeature = null;
      this.selectedFeatureId = null;
      this.updateLayers(); // Refresh layers to remove selection highlight
    }
  }

  // Helper method to get a unique ID for a feature
  getFeatureId(feature) {
    const props = feature.properties;
    // Try multiple possible ID fields
    return props.ID || props.id || props.accident_id || 
           `${props.year || 'unknown'}_${props.WOJ || 'unknown'}_${feature.geometry.coordinates.join('_')}`;
  }

  getSeverityFromFeature(feature) {
    const props = feature.properties;
    
    // Try multiple ways to determine severity
    // 1. Direct severity property
    if (props.severity) {
      return props.severity;
    }
    
    // 2. Numeric severity code
    if (props.sev !== undefined) {
      return this.severityMapping[props.sev] || 'DamageOnly';
    }
    
    // 3. Based on casualtys counts - determine highest severity
    const fatal = props[3] || props.fatal || props.ZM || 0;
    const serious = props[2] || props.serious || props.ZC || 0;
    const slight = props[1] || props.slight || props.RL || 0;
    
    var sev = 'DamageOnly'

    if (slight > 0) sev = 'Slight';
    if (serious > 0) sev = 'Serious';
    if (fatal > 0) sev = 'Fatal';

    // 4. Default to damage only
    return sev;
  }
  
  getSeverityDisplayName(severity) {
    const t = this.translations[this.currentLanguage];
    const severityMap = {
      'Fatal': t.fatal,
      'Serious': t.serious,
      'Slight': t.slight,
      'DamageOnly': t.damageOnly
    };
    return severityMap[severity] || severity;
  }
}

// Initialize the visualization when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new AccidentVisualization();
});