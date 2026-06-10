"""Seed the lookups table with all dropdown values previously hardcoded in the frontend."""

import psycopg2

DATA = {
    "section": ["GP-03","GP-06","GP-15","GP-16","GP-36","GP-61","GP-81","REL","RCC","HSE","Contracts","Operations"],
    "category": [
        "General Admin","Accounts","HR(Manpower)","Legal/Arbitration/CourtCase","Contracts CorrespondanceLetter",
        "Contract Execution Chronology","Contractual Bill Summary","Crop Compensation / Farmers","CSR Initiative",
        "Equipment/Electronics","Navigation/Survey Data","Permissions / Statutory Clearances","Requisitions Asset/Basin",
        "Annual Work Porgram (AWP)","Project Report","Operations/Acquisition Report","Observer Report",
        "Processing Report","Survey Geometry/SPS Data","Uphole Reports","Activity Reports",
        "Reconnaissance Survey Report","Atlas / Summary Report","Technical Report/Presentation",
        "SOPs/Workflow/Processing Flow","Field QC Report","Minutes of Meeting/MRM","PPE/Kits & Liveries",
        "Audit ATR/Compliances","VCC Presentation","Legacy Data / Acquisition Chronology","Data Entry Formats",
        "Explosives/PESO","Instrument Calibration / Testing Reports","Daily Progress Report (DPR)",
        "Field Trouble Reports","Crew Deployment / Field Roster","Training / Induction Records",
        "Data Submission Records","Procurement Details","Technology/Innovation","Asset Condemnation",
        "Training Records","Vehicles / Records","Handing/Taking Over","Experimental Plan/Report",
        "Block Wise Coverage","Basin QCG Report and ATR","Important Orders and Circulars",
        "Communication with Contractors","Bank / RCA Account","DISHA Approvals","RTI / Complaint Letters",
    ],
    "season": [
        "2025-26","2024-25","2023-24","2022-23","2021-22","2020-21","2019-20","2018-19","2017-18","2016-17",
        "2015-16","2014-15","2013-14","2012-13","2011-12","2010-11","2009-10","2008-09","2007-08","2006-07",
        "2005-06","2004-05","2003-04","2002-03","2001-02","2000-01","1999-00","1998-99","1997-98","1996-97",
        "1995-96","1994-95","1993-94","1992-93","1991-92","1990-91","1989-90","1988-89","1987-88","1986-87",
        "1985-86","1984-85","1983-84","1982-83","1981-82","1980-81","1979-80","1978-79","1977-78","1976-77",
        "1975-76","1974-75","1973-74","1972-73","1971-72","1970-71","1969-70","1968-69","1967-68","1966-67",
        "1965-66","1964-65","1963-64","1962-63","1961-62","1960-61","1959-60","1958-59","1957-58","1956-57",
    ],
    "block": ["Ankleshwar","Ahmedabad","Mehsana","Rajasthan","Other"],
    "file_type": ["PDF","DOCX","XLSX","PPT","TXT","DAT","CSV","ZIP"],
    "data_type": ["Seismic 2D/3D/3C/4D","LFPS","VSP","Any Other Data"],
    "classification": ["General / Available for All","Sensitive / Internal Use","Confidential","Highly Confidential / Restricted"],
}

conn = psycopg2.connect("host=localhost port=5432 dbname=ongc_db user=ongc_user password=ongc_pass")
cur = conn.cursor()

cur.execute("DELETE FROM lookups")

for typ, values in DATA.items():
    for i, val in enumerate(values):
        cur.execute(
            "INSERT INTO lookups (type, value, sort_order, is_active) VALUES (%s, %s, %s, TRUE)",
            (typ, val, i + 1),
        )

conn.commit()
cur.close()
conn.close()

total = sum(len(v) for v in DATA.values())
print(f"Seeded {total} lookup values across {len(DATA)} types.")
