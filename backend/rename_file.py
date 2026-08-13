import pandas as pd
import re

# ==========================================================
# FILE PATHS
# ==========================================================

INPUT_FILE = "data/finalized survey.xlsx"
OUTPUT_FILE = "data/finalized_survey_clean.xlsx"

# ==========================================================
# COLUMN MAPPING
# ==========================================================

COLUMN_MAPPING = {
    "collectionDate": "collection_date",
    "uniqueID": "unique_id",
    "Name of the Employee": "employee_name",
    "Data Enumeratorsignation": "enumerator_designation",
    "Name of the Organization": "organization_name",
    "State": "state",
    "Farmer Code": "farmer_code",
    "Name of the Farmer": "farmer_name",
    "Name of the Village": "village_name",
    "Block name": "block_name",
    "District name": "district_name",

    "Thank you for considering participating in the research study conducted by the Environmental Defense Fund and Kumaraguru Institute of Agriculture in Tamil Nadu State. The purpose of this study is to develop an understanding of the Nitrogen Balance framework, specifically focusing on identifying the appropriate dosage of fertilizers (both organic and inorganic) and improving farm productivity by identifying the right management practices among farmers in Erode district of Tamil Nadu State. If you choose to participate, you will be asked to complete a survey that will inquire about your farming experience and the management practices you have adopted. The survey is expected to take approximately 10 minutes to complete and will include taking a GPS point of your farm. We assure you that there are no anticipated risks associated with participating in this survey. The questions asked in the survey are not sensitive in nature, and we will maintain the anonymity of the information you provide. If you decide to withdraw from the survey, your responses will not be saved. The survey data will be retained with us until the completion of data analysis and the findings of the study are professionally presented or published. Any presentation or publication will only include summarized results, ensuring that individual responses cannot be identified. While there are no immediate direct benefits for participating in this research, your responses may contribute to improving the Nitrogen Balance program. As a result, if you participate in future program modules, you may benefit from these improvements. Please note that you will not be compensated for taking part in this study. Ultimately, the decision to participate in this research is entirely up to you. You have the choice to take part or decline. If you have any further questions or concerns, please don't hesitate to ask the research team.": "consent_response",

    "Age": "age",
    "Education": "education",
    "Mobile Number of the Farmer": "mobile_number",
    "Select Year": "survey_year",
    "Crop": "crop",

    "Whether for ${Crop} during ${Year} was a normal year for you in terms of severe climatic events?": "normal_year_flag",

    "Which severe climatic events your ${Crop} faced during ${Year}?": "climatic_events",
    "Which severe climatic events your ${Crop} faced during ${Year}?/Erratic_rainfall": "event_erratic_rainfall",
    "Which severe climatic events your ${Crop} faced during ${Year}?/Cyclone": "event_cyclone",
    "Which severe climatic events your ${Crop} faced during ${Year}?/Drought": "event_drought",
    "Which severe climatic events your ${Crop} faced during ${Year}?/Flood": "event_flood",
    "Which severe climatic events your ${Crop} faced during ${Year}?/None": "event_none",

    "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?": "impact_stages",
    "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/sprouting": "stage_sprouting",
    "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/tillering": "stage_tillering",
    "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/grand_growth": "stage_grand_growth",
    "During which stages these severe climatic events impacted your ${Crop} crop in ${Year}?/maturity": "stage_maturity",

    "What is the total acreage of the farmer under ${Crop} for the Year ${Year} in Acres?": "total_acreage",
    "What is the size of the largest plot of the ${Crop} Crop for the Year ${Year} in Acres?": "largest_plot_acres",
    "LandArea_hectare": "land_area_hectare",

    "What is the type of irrigation in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?": "irrigation_type",

    "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?": "fertilizer_application_method",
    "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Broadcasting": "method_broadcasting",
    "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Surface_fertigation": "method_surface_fertigation",
    "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Sub_surface_fertigation": "method_sub_surface_fertigation",
    "What is the type of fertilizer application method in your largest plot of ${Crop} Crop for the Year ${Year} in Acres?/Foliar_application": "method_foliar_application",

    "Select Crop Type": "crop_type",
    "Select Ratoon Type": "ratoon_type",
    "Do you wish to go for next Ratoon for this crop?": "next_ratoon_wish",

    "What is the Yield from the largest plot for ${Crop} Crop in Tonnes for the Year ${Year}.": "yield_tonnes",
    "Yield_Tonnes_ha": "yield_tonnes_ha",

    "Total Urea used in the largest plot of ${Crop} Crop (in Kgs.)": "urea_kg",
    "Total DAP used in the largest plot of ${Crop} Crop (in Kgs.)": "dap_kg",
    "Total SSP used in the largest plot of ${Crop} Crop (in Kgs.)": "ssp_kg",
    "Total MOP used in the largest plot of ${Crop} Crop (in Kgs.)": "mop_kg",
    "Total NPK 10-26-26 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_10_26_26_kg",
    "Total NPK 12-32-16 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_12_32_16_kg",
    "Total NPS 20-20-0-13 used in the largest plot of ${Crop} Crop (in Kgs.)": "nps_20_20_0_13_kg",
    "Total Ammonium Sulphate used in the largest plot of ${Crop} Crop (in Kgs.)": "ammonium_sulphate_kg",
    "Total Ammonium Chloride used in the largest plot of ${Crop} Crop (in Kgs.)": "ammonium_chloride_kg",
    "Total NPK 17-17-17 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_17_17_17_kg",
    "Total NPKS-16-20-0-13 used in the largest plot of ${Crop} Crop (in Kgs.)": "npks_16_20_0_13_kg",
    "Total NPK-16-16-16 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_16_16_16_kg",
    "Total NPK-12-61-0 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_12_61_0_kg",
    "Total NPKS-15-15-15-09 used in the largest plot of ${Crop} Crop (in Kgs.)": "npks_15_15_15_09_kg",
    "Total NPK-19-19-19 used in the largest plot of ${Crop} Crop (in Kgs.)": "npk_19_19_19_kg",
    "Total Mono_11_52_0 used in the largest plot of ${Crop} Crop (in Kgs.)": "mono_11_52_0_kg",
    "Total Calcium_ammonium_nitrate used in the largest plot of ${Crop} Crop (in Kgs.)": "calcium_ammonium_nitrate_kg",
    "Total Farm Yard Manure used in the largest plot of ${Crop} Crop (in Kgs.)": "farm_yard_manure_kg",
    "Total Vermicompost used in the largest plot of ${Crop} Crop (in Kgs.)": "vermicompost_kg",
    "Total Goat/Sheep Manure used in the largest plot of ${Crop} Crop (in Kgs.)": "goat_sheep_manure_kg",
    "Total Poultry Manure used in the largest plot of ${Crop} Crop (in Kgs.)": "poultry_manure_kg",
    "Total Press Mud used in the largest plot of ${Crop} Crop (in Kgs.)": "press_mud_kg",
    "Total Jeevamrut/GhanaJivamrut used in the largest plot of ${Crop} Crop (in Kgs.)": "jeevamrut_kg",

    "tna": "tna"
}

# ==========================================================
# LOAD EXCEL
# ==========================================================

df = pd.read_excel(INPUT_FILE)

# Clean header names
df.columns = (
    df.columns
      .astype(str)
      .str.strip()
      .str.replace(r"\s+", " ", regex=True)
)

# Rename headers
df.rename(columns=COLUMN_MAPPING, inplace=True)

# Show unmapped columns
print("\n========== UNMAPPED COLUMNS ==========\n")

unmapped = [col for col in df.columns if col not in COLUMN_MAPPING.values()]

if len(unmapped) == 0:
    print("🎉 All columns mapped successfully!")
else:
    for col in unmapped:
        print(f"❌ {col}")

print("\n======================================\n")

# Save cleaned Excel
df.to_excel(OUTPUT_FILE, index=False)

print(f"✅ Cleaned file saved as:\n{OUTPUT_FILE}")
print(f"📊 Total Columns: {len(df.columns)}")
print(f"📄 Total Rows: {len(df)}")