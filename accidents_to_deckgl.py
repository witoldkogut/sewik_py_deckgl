# Skrypt do przygotowania danych do strony opartej na Deck GL
# Script for Deck GL based website data preparation

import pandas as pd
import geopandas as gpd
import json
from datetime import datetime
from shapely.geometry import Point
import os


def parse_gps(coord_str):
    """Parse GPS coordinates from Polish DMS format like "21*22'806" to decimal degrees"""
    if pd.isna(coord_str) or coord_str == '':
        return None
    try:
        # Try direct float conversion first (for decimal degrees)
        return float(coord_str)
    except:
        try:
            # Parse degree*minute'second format like "21*22'806"
            if '*' in str(coord_str) and "'" in str(coord_str):
                coord_str = str(coord_str)
                # Split by * to get degrees and minutes'seconds
                parts = coord_str.split('*')
                if len(parts) == 2:
                    degrees = float(parts[0])
                    # Split minutes'seconds by '
                    min_sec = parts[1].split("'")
                    if len(min_sec) == 2:
                        minutes = float(min_sec[0])
                        # Handle seconds with implied decimal point
                        seconds_str = min_sec[1]
                        if seconds_str:
                            seconds_num = float(seconds_str)
                            # Convert based on number of digits
                            if len(seconds_str) == 1:
                                # Single digit: 8 -> 8.0 seconds
                                seconds = seconds_num
                            elif len(seconds_str) == 2:
                                # Two digits: 78 -> 7.8 seconds
                                seconds = seconds_num / 10.0
                            elif len(seconds_str) == 3:
                                # Three digits: 806 -> 80.6 seconds
                                seconds = seconds_num / 10.0
                            elif len(seconds_str) == 4:
                                # Four digits: 8065 -> 80.65 seconds
                                seconds = seconds_num / 100.0
                            else:
                                # Default: divide by 10
                                seconds = seconds_num / 10.0
                        else:
                            seconds = 0.0
                        
                        # Convert to decimal degrees
                        decimal_degrees = degrees + minutes/60.0 + seconds/3600.0
                        return decimal_degrees
            return None
        except Exception as e:
            print(f"Error parsing coordinate '{coord_str}': {e}")
            return None

def convert_accidents_for_deckgl():
    """Convert SEWIK accidents data to deck.gl compatible GeoJSON format by year and voivodeship"""
    print("Loading accident data...")
    df = pd.read_csv('sewik_accidents.csv', low_memory=False)
    print(f"Loaded {len(df):,} accidents")
    
    # Parse GPS coordinates
    print("Parsing GPS coordinates...")
    df['lon'] = df['WSP_GPS_X'].apply(parse_gps)
    df['lat'] = df['WSP_GPS_Y'].apply(parse_gps)
    
    # Convert to numeric, coercing errors to NaN
    df['lon'] = pd.to_numeric(df['lon'], errors='coerce')
    df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
    
    # Filter out rows without valid coordinates and unrealistic coordinates
    # Poland's longitude range: approximately 14° to 24° E
    # Poland's latitude range: approximately 49° to 55° N
    before_filter = len(df)
    df = df.dropna(subset=['lon', 'lat'])
    print(f"Filtered to {len(df):,} accidents with valid coordinates ({before_filter - len(df):,} removed)")
    
    # Convert date columns
    df['DATA_ZDARZENIA'] = pd.to_datetime(df['DATA_ZDARZENIA'], errors='coerce')
    df['year'] = df['DATA_ZDARZENIA'].dt.year
    df['month'] = df['DATA_ZDARZENIA'].dt.month
    df['day'] = df['DATA_ZDARZENIA'].dt.day
    df['date'] = df["DATA_ZDARZENIA"]
    
    # Load casualties
    severity_mapping = {"RL": 1, "RC": 2, "ZC": 3, "ZM": 3}
    casualties_df = pd.read_csv("sewik_casualties.csv")
    casualties_df["severity"] = casualties_df['STUC_KOD'].map(severity_mapping, na_action='ignore')
    casualties_df['severity'] = casualties_df['severity'].fillna(0)
    casualties_df['severity'] = casualties_df['severity'].astype(int)
    casualties_by_severity_df = pd.DataFrame(casualties_df[["ZSZD_ID", "severity", "ID"]].groupby(["ZSZD_ID", "severity"]).count())
    casualties_by_severity_df = casualties_by_severity_df.rename({"ID": "count"}, axis=1)
    casualties_by_severity_df = casualties_by_severity_df.reset_index().pivot(index="ZSZD_ID", columns="severity", values="count").fillna(0).astype(int)
    # Create severity categories based on casualties
    df = df.merge(casualties_by_severity_df, left_on="ID", right_index=True)
    df["sev"] = 0
    df.loc[df[1] > 0, "sev"] = 1
    df.loc[df[2] > 0, "sev"] = 2
    df.loc[df[3] > 0, "sev"] = 3

    # Create color mapping for severity
    severity_colors = {
        0 : [128, 128, 128, 160],    # Damage only
        1 : [255, 255, 0, 160],    # Slight
        2: [255, 165, 0, 160],   # Serious  
        3: [255, 0, 0, 160]       # Fatal
    }
    
    # Add color column
    df['color'] = df['sev'].map(severity_colors)
    df = df.rename({0: "other", 1: "slight", 2: "serious", 3: "fatal"}, axis=1)

    df[["lon", "lat"]] = df[["lon", "lat"]].round(6)

    # Create output directory
    output_dir = 'deckgl_viz/data'
    os.makedirs(output_dir, exist_ok=True)
    
    # Select only essential columns for visualization
    essential_columns = [
        'ID', 'lon', 'lat', 'year', 'date', 'WOJ', 'sev',
        'color', 'other', 'slight', 'serious', 'fatal', #'WSP_GPS_X', 'WSP_GPS_Y', 'GPS_X_GUS', 'GPS_Y_GUS',
        #'JEDNOSTKA_OPERATORA', 'JEDNOSTKA_LIKWIDUJACA', 'JEDNOSTKA_MIEJSCA',
        #'ULICA_ADRES', 'NUMER_DOMU'
        ]
    
    # Add important optional columns if they exist
    optional_columns = {
        # 'DATA_ZDARZENIA': 'date',
        # 'MIEJSCOWOSC': 'city',
        # 'LIC_ZABITYCH': 'fatalities',
        # 'LIC_RANNYCH': 'injuries'
    }
    
    # Build final column list with only available columns
    viz_columns = essential_columns.copy()
    
    for col in optional_columns.keys():
        if col in df.columns:
            viz_columns.append(col)
    
    # Create the visualization dataset
    viz_df = df[viz_columns].copy()
    
    # Get unique years and voivodeships
    years = sorted(viz_df['year'].dropna().unique())
    voivodeships = sorted(viz_df['WOJ'].dropna().unique())
    
    print(f"Creating GeoJSON files for {len(years)} years and {len(voivodeships)} voivodeships...")
    
    file_index = []
    total_files = 0
    
    # Create GeoJSON for each year and voivodeship combination
    for year in years:
        year_data = viz_df[viz_df['year'] == year]
        
        for voivodeship in voivodeships:
            subset = year_data[year_data['WOJ'] == voivodeship]
            
            if len(subset) == 0:
                continue
                
            # Create GeoDataFrame with Point geometries
            geometry = [Point(xy) for xy in zip(subset['lon'], subset['lat'])]
            gdf = gpd.GeoDataFrame(subset.drop(['lon', 'lat'], axis=1), 
                                  geometry=geometry, 
                                  crs='EPSG:4326')
            
            # Create filename
            voivodeship_clean = str(voivodeship).replace(' ', '_').replace('/', '_')
            filename = f"accidents_{int(year)}_{voivodeship_clean}.geojson"
            filepath = os.path.join(output_dir, filename)
            
            # Save as GeoJSON
            gdf.to_file(filepath, driver='GeoJSON')
            
            file_info = {
                'filename': filename,
                'year': int(year),
                'voivodeship': voivodeship,
                'accident_count': len(subset),
                'severity_distribution': subset['sev'].value_counts().to_dict()
            }
            file_index.append(file_info)
            total_files += 1
            
            if total_files % 50 == 0:
                print(f"Created {total_files} files...")
    
    # Create index file
    index_file = os.path.join(output_dir, 'file_index.json')
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(file_index, f, ensure_ascii=False, indent=2)
    
    # Create metadata
    metadata = {
        'total_accidents': len(viz_df),
        'total_files': total_files,
        'years': [int(y) for y in years],
        'voivodeships': list(voivodeships),
        'date_range': {
            'min_year': int(viz_df['year'].min()) if not pd.isna(viz_df['year'].min()) else None,
            'max_year': int(viz_df['year'].max()) if not pd.isna(viz_df['year'].max()) else None
        },
        'coordinates_range': {
            'lon': [float(viz_df['lon'].min()), float(viz_df['lon'].max())],
            'lat': [float(viz_df['lat'].min()), float(viz_df['lat'].max())]
        },
        'severity_counts': viz_df['sev'].value_counts().to_dict(),
        'generated_at': datetime.now().isoformat(),
        'format': 'GeoJSON',
        'structure': 'year_voivodeship'
    }
    
    metadata_file = 'deckgl_viz/metadata.json'
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    print(f"\nConversion complete!")
    print(f"- Created {total_files} GeoJSON files in {output_dir}")
    print(f"- File index: {index_file}")
    print(f"- Metadata: {metadata_file}")
    print(f"\nOverall severity distribution:")
    for severity, count in viz_df['sev'].value_counts().items():
        print(f"  {severity}: {count:,}")
    print(f"\nYears: {min(years)} - {max(years)}")
    print(f"Voivodeships: {len(voivodeships)}")

if __name__ == "__main__":
    convert_accidents_for_deckgl()
