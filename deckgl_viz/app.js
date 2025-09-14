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
    
    // Current language
    this.currentLanguage = 'pl';
    
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
        clickToPin: 'Click to pin tooltip'
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
        serious: 'Ciężko ranne',
        slight: 'Lekko ranne',
        other: 'Tylko szkody',
        viewInSewik: 'Zobacz w bazie SEWIK',
        clickToPin: 'Kliknij aby przypiąć tooltip'
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
        attribution: '© OpenStreetMap contributors'
      },
      'satellite': {
        name: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Esri, Maxar, GeoEye, Earthstar Geographics'
      },
      'cartodb-light': {
        name: 'CartoDB Light',
        url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors © CARTO'
      },
      'cartodb-dark': {
        name: 'CartoDB Dark',
        url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors © CARTO'
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
        zoom: 6,
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
          bounds: [west, south, east, north]
        });
      },
      
      onTileLoad: (tile) => {
        console.log('Tile loaded:', tile.index);
      },
      
      onTileError: (tile, error) => {
        console.warn('Tile error:', tile.index, error);
      }
    });
  }
  
  createLayers() {
    const layers = [this.createTileLayer()];
    
    if (this.currentData && this.currentData.features.length > 0) {
      const radius = parseInt(document.getElementById('radius-slider')?.value || '5');
      const opacity = parseFloat(document.getElementById('opacity-slider')?.value || '0.6');
      
      const accidentLayer = new GeoJsonLayer({
        id: 'accidents',
        data: this.currentData,
        pointType: 'circle',
        getPointRadius: radius,
        getFillColor: d => d.properties.color || [255, 0, 0, 160],
        getLineColor: [0, 0, 0, 100],
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 1,
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
    
    // Populate map style dropdown
    this.updateMapStyleDropdown();
    
    // Add event listeners
    document.getElementById('language-select').addEventListener('change', (e) => {
      this.currentLanguage = e.target.value;
      this.updateLanguage();
    });
    
    document.getElementById('map-style-select').addEventListener('change', (e) => {
      this.currentMapStyle = e.target.value;
      this.updateLayers();
    });
    
    // Radius slider
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValue = document.getElementById('radius-value');
    radiusSlider.addEventListener('input', (e) => {
      radiusValue.textContent = e.target.value;
      this.updateLayers();
    });
    
    // Opacity slider
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityValue = document.getElementById('opacity-value');
    opacitySlider.addEventListener('input', (e) => {
      opacityValue.textContent = e.target.value;
      this.updateLayers();
    });
    
    // Initialize language
    this.updateLanguage();
  }
  
  createYearButtons() {
    const container = document.getElementById('year-buttons');
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
  
  updateMapStyleDropdown() {
    const mapStyleSelect = document.getElementById('map-style-select');
    if (!mapStyleSelect) return;
    
    mapStyleSelect.innerHTML = '';
    
    Object.entries(this.mapStyles).forEach(([key, style]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = style.name;
      mapStyleSelect.appendChild(option);
    });
    
    mapStyleSelect.value = this.currentMapStyle;
  }
  
  async loadData() {
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    
    try {
      const selectedYears = Array.from(this.selectedYears);
      const selectedVoivodeships = Array.from(this.selectedVoivodeships);
      
      console.log(`Loading data for years: [${selectedYears.join(', ')}], voivodeships: [${selectedVoivodeships.join(', ')}]`);
      
      if (selectedYears.length === 0 || selectedVoivodeships.length === 0) {
        this.currentData = { type: 'FeatureCollection', features: [] };
        this.updateLayers();
        this.updateStats(0, {});
        loading.innerHTML = 'Loading data...';
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
        loading.innerHTML = `Loading file ${i + 1}/${filesToLoad.length}...<br>${fileInfo.filename}`;
        
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
      loading.style.display = 'none';
      loading.innerHTML = 'Loading data...';
    }
  }
  
  updateLayers() {
    this.deckgl.setProps({ layers: this.createLayers() });
  }
  
  updateLanguage() {
    const t = this.translations[this.currentLanguage];
    
    // Update main UI elements
    document.getElementById('title').textContent = t.title;
    document.getElementById('language-label').textContent = t.languageLabel;
    document.getElementById('map-style-label').textContent = t.mapStyleLabel;
    document.getElementById('years-label').innerHTML = `
      ${t.yearsLabel}
      <button class="show-button" onclick="app.showAllYears()" id="show-all-years">${t.showAll}</button>
      <button class="clear-button" onclick="app.clearYearSelection()" id="clear-all-years">${t.clearAll}</button>
    `;
    document.getElementById('voivodeships-label').innerHTML = `
      ${t.voivodeshipsLabel}
      <button class="show-button" onclick="app.showAllVoivodeships()" id="show-all-voivodeships">${t.showAll}</button>
      <button class="clear-button" onclick="app.clearVoivodeshipSelection()" id="clear-all-voivodeships">${t.clearAll}</button>
    `;
    
    // Update slider labels
    document.getElementById('radius-label').innerHTML = `${t.pointSize} <span id="radius-value">${document.getElementById('radius-slider').value}</span>`;
    document.getElementById('opacity-label').innerHTML = `${t.opacity} <span id="opacity-value">${document.getElementById('opacity-slider').value}</span>`;
    
    // Update legend
    document.getElementById('severity-legend').textContent = t.severity;
    document.getElementById('minor-legend').textContent = t.damageOnly;
    document.getElementById('injury-legend').textContent = t.slight;
    document.getElementById('fatal-legend').textContent = t.serious;
    
    // Add fourth legend item for fatal if it doesn't exist
    const legend = document.querySelector('.legend');
    let fatalLegendItem = document.getElementById('fatal-legend-item');
    if (!fatalLegendItem) {
      fatalLegendItem = document.createElement('div');
      fatalLegendItem.className = 'legend-item';
      fatalLegendItem.id = 'fatal-legend-item';
      fatalLegendItem.innerHTML = `
        <div class="legend-color" style="background-color: rgb(139, 0, 0);"></div>
        <span id="fatal-legend-text">${t.fatal}</span>
      `;
      legend.appendChild(fatalLegendItem);
    } else {
      document.getElementById('fatal-legend-text').textContent = t.fatal;
    }
    
    // Update loading text
    document.getElementById('loading-text').textContent = t.loadingData;
    
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
      const t = this.translations[this.currentLanguage];
      stats.textContent = t.noDataLoaded;
    }
  }

  updateStats(totalAccidents, severityCounts) {
    const stats = document.getElementById('stats');
    const total = Object.values(severityCounts).reduce((a, b) => a + b, 0);
    const t = this.translations[this.currentLanguage];
    
    const selectedYears = Array.from(this.selectedYears).sort();
    const selectedVoivodeships = Array.from(this.selectedVoivodeships);
    
    stats.innerHTML = `
      <strong>${t.selection}</strong><br>
      ${t.years} ${selectedYears.length > 0 ? selectedYears.join(', ') : t.unknown}<br>
      ${t.voivodeships} ${selectedVoivodeships.length}<br><br>
      <strong>${t.totalAccidents}</strong> ${totalAccidents.toLocaleString()}<br>
      <strong>${t.displayed}</strong> ${total.toLocaleString()}<br>
      ${t.fatal}: ${(severityCounts.Fatal || 0).toLocaleString()}<br>
      ${t.serious}: ${(severityCounts.Serious || 0).toLocaleString()}<br>
      ${t.slight}: ${(severityCounts.Slight || 0).toLocaleString()}<br>
      ${t.damageOnly}: ${(severityCounts.DamageOnly || 0).toLocaleString()}
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
      this.showPersistentTooltip(info);
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
    const fatal = props[3] || props.fatalities || props.ZM || 0;
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
    }
  }
  
  getSeverityFromFeature(feature) {
    const props = feature.properties;
    
    // Try multiple ways to determine severity
    // 1. Direct severity property
    if (props.severity) {
      return props.severity;
    }
    
    // 2. Numeric severity code
    if (props.severity_code !== undefined) {
      return this.severityMapping[props.severity_code] || 'DamageOnly';
    }
    
    // 3. Based on casualty counts - determine highest severity
    const fatal = props[3] || props.fatalities || props.ZM || 0;
    const serious = props[2] || props.serious || props.ZC || 0;
    const slight = props[1] || props.slight || props.RL || 0;
    
    if (fatal > 0) return 'Fatal';
    if (serious > 0) return 'Serious';
    if (slight > 0) return 'Slight';
    
    // 4. Default to damage only
    return 'DamageOnly';
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