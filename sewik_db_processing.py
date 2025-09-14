# Skrypt do stworzenia trzech plików CSV na podstawie bazy danych XML: wypadki (accidents), pojazdy (vehicles), ofiary (casualties)
# Script to process Sewik Database from XML to 3 csvs: accidents, vehicles, casualties
import pandas as pd
from glob import glob
import os

# Initialize empty lists to store all data
all_accidents = []
all_vehicles = []
all_casualties = []

print("Starting data extraction...")

for year in range(2018, 2025):
    folder = os.path.join(os.path.dirname(__file__), "baza", str(year))
    files = glob(os.path.join(folder, "*.xml"))
    
    print(f"Processing year {year}, found {len(files)} files")
    
    for file in files:
        print(f"  Processing: {os.path.basename(file)}")
        try:
            # Extract accidents (main ZDARZENIE elements)
            accidents_df = pd.read_xml(file, xpath="//ZDARZENIE")
            if not accidents_df.empty:
                accidents_df['source_file'] = os.path.basename(file)
                accidents_df['year'] = year
                all_accidents.append(accidents_df)
            
            # Extract vehicles (POJAZD elements)
            vehicles_df = pd.read_xml(file, xpath="//POJAZD")
            if not vehicles_df.empty:
                vehicles_df['source_file'] = os.path.basename(file)
                vehicles_df['year'] = year
                all_vehicles.append(vehicles_df)
            
            # Extract casualties (OSOBA elements)
            casualties_df = pd.read_xml(file, xpath="//OSOBA")
            if not casualties_df.empty:
                casualties_df['source_file'] = os.path.basename(file)
                casualties_df['year'] = year
                all_casualties.append(casualties_df)
                
        except Exception as e:
            print(f"    Error processing {file}: {e}")
            continue

print("Combining data...")

# Combine all dataframes
if all_accidents:
    accidents_combined = pd.concat(all_accidents, ignore_index=True)
    print(f"Total accidents: {len(accidents_combined)}")
    accidents_combined.to_csv('csv/sewik_accidents.csv', index=False, encoding='utf-8')
    print("Saved sewik_accidents.csv")

if all_vehicles:
    vehicles_combined = pd.concat(all_vehicles, ignore_index=True)
    print(f"Total vehicles: {len(vehicles_combined)}")
    vehicles_combined.to_csv('csv/sewik_vehicles.csv', index=False, encoding='utf-8')
    print("Saved sewik_vehicles.csv")

if all_casualties:
    casualties_combined = pd.concat(all_casualties, ignore_index=True)
    print(f"Total casualties: {len(casualties_combined)}")
    casualties_combined.to_csv('csv/sewik_casualties.csv', index=False, encoding='utf-8')
    print("Saved sewik_casualties.csv")

print("Data extraction complete!")