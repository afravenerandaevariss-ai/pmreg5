/**
 * AUTO-GENERATED USER IMPORT SCRIPT
 * Generated: 20/8/2026, 09.19.29
 * Source: D:/Eval PM/Monitoring logbook/MP/MP/tutorial/list user.xlsx
 * Total users: 133
 * 
 * SAFE: Only inserts NEW users. Protected NIKs are skipped.
 * Run: node import_from_excel_generated.mjs [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pabnvxlvrussdfhisxzn.supabase.co";
const SUPABASE_KEY = "sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4";
const DRY_RUN = process.argv.includes("--dry-run");

const PROTECTED_NIKS = new Set(["13005791","19010048","03000593","3000593","13004524","13005430","13005483","13005488","13006983","13006990","13007898","13008078"]);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXCEL_USERS = [
  {
    "nik": "13004627",
    "name": "ANDHI HARTADI",
    "jabatan": "ASISTEN TEKNIK",
    "plant": "5F01",
    "unitName": "PABRIK GUNUNG MELIAU",
    "noHp": "+62 811-877-797",
    "role": "USER"
  },
  {
    "nik": "19003496",
    "name": "ANDRE KEVIN SIMATUPANG",
    "jabatan": "KRANI TEKNIK",
    "plant": "5F01",
    "unitName": "PABRIK GUNUNG MELIAU",
    "noHp": "+62 821-5446-0769",
    "role": "USER"
  },
  {
    "nik": "13004468",
    "name": "HERMAN",
    "jabatan": "ASISTEN TEKNIK",
    "plant": "5F04",
    "unitName": "PABRIK RIMBA BELIAN",
    "noHp": "+62 821-5357-3558",
    "role": "USER"
  },
  {
    "nik": "13000885",
    "name": "DARWIS SIMATUPANG",
    "jabatan": "PEMBANTU KRANI TEKNIK",
    "plant": "5F04",
    "unitName": "PABRIK RIMBA BELIAN",
    "noHp": "+62 822-5014-4873",
    "role": "USER"
  },
  {
    "nik": "13000526",
    "name": "SUTRISNO",
    "jabatan": "ASISTEN TEKNIK",
    "plant": "5F07",
    "unitName": "PABRIK NGABANG",
    "noHp": "+62 822-5105-1623",
    "role": "USER"
  },
  {
    "nik": "13007185",
    "name": "VABIANUS RYZA",
    "jabatan": "KRANI TEKNIK",
    "plant": "5F07",
    "unitName": "PABRIK NGABANG",
    "noHp": "‎+62 831-4373-6717",
    "role": "USER"
  },
  {
    "nik": "13003757",
    "name": "SUISWADI",
    "jabatan": "ASISTEN TEKNIK",
    "plant": "5F08",
    "unitName": "PABRIK PARINDU",
    "noHp": "‎+62 852-4842-1903",
    "role": "USER"
  },
  {
    "nik": "13001826",
    "name": "HERIYANTO",
    "jabatan": "KRANI KEUANGAN DAN ANGGARAN",
    "plant": "5F08",
    "unitName": "PABRIK PARINDU",
    "noHp": "+62 815-2096-4976",
    "role": "USER"
  },
  {
    "nik": "19006776",
    "name": "AHMAD DARWIN SIREGAR",
    "jabatan": "ASISTEN TEKNIK",
    "plant": "5F09",
    "unitName": "PABRIK KEMBAYAN",
    "noHp": "+62 853-5059-1959",
    "role": "USER"
  },
  {
    "nik": "19003120",
    "name": "HERMANTO",
    "jabatan": "PEMBANTU OPERATOR KAMAR MESIN",
    "plant": "5F09",
    "unitName": "PABRIK KEMBAYAN",
    "noHp": "+62 856-5440-4691",
    "role": "USER"
  },
  {
    "nik": "13006816",
    "name": "ARDIANOR",
    "jabatan": "KRANI",
    "plant": "5F14",
    "unitName": "PABRIK PAMUKAN",
    "noHp": "+62 823-5858-0311",
    "role": "USER"
  },
  {
    "nik": "13007990",
    "name": "SETIA PONCOWATI",
    "jabatan": "KRANI",
    "plant": "5F14",
    "unitName": "PABRIK PAMUKAN",
    "noHp": "+62 838-6272-9845",
    "role": "USER"
  },
  {
    "nik": "13004643",
    "name": "BUHARI MUSLIM",
    "jabatan": "KRANI 1",
    "plant": "5F15",
    "unitName": "PABRIK PELAIHARI",
    "noHp": "+62 853-4569-1417",
    "role": "USER"
  },
  {
    "nik": "13007911",
    "name": "AMINUDDIN RIFAI RAMBE",
    "jabatan": "KRANI TEKNIK",
    "plant": "5F15",
    "unitName": "PABRIK PELAIHARI",
    "noHp": "+62 858-4574-4578",
    "role": "USER"
  },
  {
    "nik": "13004547",
    "name": "SULAIMAN",
    "jabatan": "KRANI",
    "plant": "5F21",
    "unitName": "PABRIK SAMUNTAI",
    "noHp": "+62 853-3883-1941",
    "role": "USER"
  },
  {
    "nik": "13007913",
    "name": "AULIA BADRUN ADZ DZUHRI",
    "jabatan": "KRANI TEKNIK",
    "plant": "5F21",
    "unitName": "PABRIK SAMUNTAI",
    "noHp": "+62 821-5253-2936",
    "role": "USER"
  },
  {
    "nik": "13000992",
    "name": "QOSIM",
    "jabatan": "ASISTEN TEKNIK",
    "plant": "5F22",
    "unitName": "PABRIK LONG PINANG",
    "noHp": "+62 852-5107-2718",
    "role": "USER"
  },
  {
    "nik": "13007885",
    "name": "MUHAMMAD RIZAL",
    "jabatan": "KRANI TEKNIK",
    "plant": "5F22",
    "unitName": "PABRIK LONG PINANG",
    "noHp": "+62 815-4947-8763",
    "role": "USER"
  },
  {
    "nik": "03000593",
    "name": "ABDUL HALIM LUBIS",
    "jabatan": "LEAD ERP SAP PTPN IV REGIONAL V",
    "plant": "5R00",
    "unitName": "AKUNTANSI DAN KEUANGAN",
    "noHp": "+62 813-9796-1589",
    "role": "ADMIN"
  },
  {
    "nik": "13005488",
    "name": "HARNIKA",
    "jabatan": "ASISTEN MESIN DAN INSTALASI PABRIK",
    "plant": "5R00",
    "unitName": "TEKNIK DAN PENGOLAHAN",
    "noHp": "+62 852-4587-8429",
    "role": "ADMIN"
  },
  {
    "nik": "13005483",
    "name": "DADANG MULIA",
    "jabatan": "ASISTEN SIPIL DAN INFRASTRUKTUR KEBUN",
    "plant": "5R00",
    "unitName": "TEKNIK DAN PENGOLAHAN",
    "noHp": "+62 852-4544-2254",
    "role": "ADMIN"
  },
  {
    "nik": "13008078",
    "name": "DANDI MAULANA",
    "jabatan": "KRANI ADMINISTRASI",
    "plant": "5R00",
    "unitName": "TEKNIK DAN PENGOLAHAN",
    "noHp": "+62 851-5881-2701",
    "role": "ADMIN"
  },
  {
    "nik": "19010048",
    "name": "AFRA VENERANDA EVARIS",
    "jabatan": "KEYUSER PM",
    "plant": "5R00",
    "unitName": "AKUNTANSI DAN KEUANGAN",
    "noHp": "81251334618",
    "role": "DEV"
  },
  {
    "nik": "13005791",
    "name": "EKO PUJI CAHYONO",
    "jabatan": "KEYUSER CO",
    "plant": "5R00",
    "unitName": "AKUNTANSI DAN KEUANGAN",
    "noHp": "+62 895-0995-1990",
    "role": "DEV"
  },
  {
    "nik": "13006983",
    "name": "HEMAS HAFIDH BACHTIAR",
    "jabatan": "KEYUSER MM",
    "plant": "5R00",
    "unitName": "AKUNTANSI DAN KEUANGAN",
    "noHp": "+62 812-3051-6195",
    "role": "ADMIN"
  },
  {
    "nik": "13004524",
    "name": "MARJUNITA",
    "jabatan": "KEYUSER MM",
    "plant": "5R00",
    "unitName": "AKUNTANSI DAN KEUANGAN",
    "noHp": "+62 857-7788-3838",
    "role": "ADMIN"
  },
  {
    "nik": "13006990",
    "name": "Ramadhan",
    "jabatan": "Asisten Mesin dan Instalasi Pabrik",
    "plant": "5TEP",
    "unitName": "Teknik dan Pengolahan",
    "noHp": "81251334618",
    "role": "ADMIN"
  },
  {
    "nik": "13007094",
    "name": "MARKUS PARNO",
    "jabatan": "KRANI FINANCIAL",
    "plant": "5E01",
    "unitName": "KEBUN GUNUNG MELIAU",
    "noHp": "85387717794",
    "role": "USER"
  },
  {
    "nik": "13004623",
    "name": "IMAM SUGIRI/RITA EVA",
    "jabatan": "KRANI FINANSIAL/KRANI TEKNIK",
    "plant": "5E13",
    "unitName": "KEBUN BATULICIN",
    "noHp": "85754808737",
    "role": "USER"
  },
  {
    "nik": "13008071",
    "name": "FATIMAH AZ'ZAHRO",
    "jabatan": "KRANI TEKNIK",
    "plant": "5E14",
    "unitName": "KEBUN PAMUKAN",
    "noHp": "81522843475",
    "role": "USER"
  },
  {
    "nik": "13004706",
    "name": "YESSIKA RATNASARI",
    "jabatan": "KRANI GUDANG",
    "plant": "5E15",
    "unitName": "KEBUN PELAIHARI",
    "noHp": "82151220102",
    "role": "USER"
  },
  {
    "nik": "13004695",
    "name": "SUCI GUSTIYASARI",
    "jabatan": "KRANI I TEKNIK",
    "plant": "5E15",
    "unitName": "KEBUN PELAIHARI",
    "noHp": "82254543399",
    "role": "USER"
  },
  {
    "nik": "13007932",
    "name": "ANUGRAH WAHIDIN S",
    "jabatan": "KRANI TEKNIK",
    "plant": "5E15",
    "unitName": "KEBUN PELAIHARI",
    "noHp": "81241867500",
    "role": "USER"
  },
  {
    "nik": "13006732",
    "name": "TRIADI SANTOSO, RAHMAN",
    "jabatan": "KRANI FINANSIL, KERANI TEKNIK",
    "plant": "5E16",
    "unitName": "KEBUN TABARA",
    "noHp": "85346261061",
    "role": "USER"
  },
  {
    "nik": "13006553",
    "name": "DEDY SUYOTO",
    "jabatan": "KRANI TEKHNIK",
    "plant": "5E18",
    "unitName": "KEBUN PANDAWA",
    "noHp": "85247041669",
    "role": "USER"
  },
  {
    "nik": "13003701",
    "name": "SAPARUDDIN",
    "jabatan": "KERANI 1 TEKNIK",
    "plant": "5E19",
    "unitName": "KEBUN LONGKALI",
    "noHp": "82153931232",
    "role": "USER"
  },
  {
    "nik": "13005045",
    "name": "ROMULUS OEMBING",
    "jabatan": "KRANI TEKNIK",
    "plant": "5F04",
    "unitName": "PABRIK RIMBA BELIAN",
    "noHp": "82150884196",
    "role": "USER"
  },
  {
    "nik": "13004526",
    "name": "F.SUGIMAN",
    "jabatan": "KRANI TEKNIK",
    "plant": "5F07",
    "unitName": "PABRIK NGABANG",
    "noHp": "82159772377",
    "role": "USER"
  },
  {
    "nik": "13000807",
    "name": "M. SYUKURDI",
    "jabatan": "KRANI TEKNIK",
    "plant": "5F22",
    "unitName": "PABRIK LONG PINANG",
    "noHp": "81250812241",
    "role": "USER"
  },
  {
    "nik": "13005594",
    "name": "MANAGAM HUTASOIT",
    "jabatan": "KRANI ANGGARAN/KEUANGAN",
    "plant": "5E01",
    "unitName": "KEBUN GUNUNG MELIAU",
    "noHp": "85651073370",
    "role": "USER"
  },
  {
    "nik": "13003464",
    "name": "RASUN",
    "jabatan": "KRANI TANAMAN",
    "plant": "5E01",
    "unitName": "KEBUN GUNUNG MELIAU",
    "noHp": "8565395488",
    "role": "USER"
  },
  {
    "nik": "13002081",
    "name": "SINGLIN BUDIANTO",
    "jabatan": "KRANI PEMBUKUAN",
    "plant": "5E02",
    "unitName": "KEBUN GUNUNG MAS",
    "noHp": "85654230600",
    "role": "USER"
  },
  {
    "nik": "13004098",
    "name": "ALPINUS ALIAM",
    "jabatan": "KRANI FINANSIAL",
    "plant": "5E02",
    "unitName": "KEBUN GUNUNG MAS",
    "noHp": "85821179470",
    "role": "USER"
  },
  {
    "nik": "13003433",
    "name": "RINA HASIM",
    "jabatan": "KRANI I TUK",
    "plant": "5E02",
    "unitName": "KEBUN GUNUNG MAS",
    "noHp": "85750036907",
    "role": "USER"
  },
  {
    "nik": "13004911",
    "name": "ADI KURNIAWAN",
    "jabatan": "KRANI I TANAMAN",
    "plant": "5E02",
    "unitName": "KEBUN GUNUNG MAS",
    "noHp": "85787917455",
    "role": "USER"
  },
  {
    "nik": "13002880",
    "name": "TM.TAMPUBOLON",
    "jabatan": "KRANI I TUK",
    "plant": "5E03",
    "unitName": "KEBUN SUNGAI DEKAN",
    "noHp": "81253784070",
    "role": "USER"
  },
  {
    "nik": "13002118",
    "name": "JUANDA SITORUS",
    "jabatan": "KRANI UPAH",
    "plant": "5E03",
    "unitName": "KEBUN SUNGAI DEKAN",
    "noHp": "81255179583",
    "role": "USER"
  },
  {
    "nik": "13001404",
    "name": "JHONLOPER PASARIBU",
    "jabatan": "KRANI FINANSIAL",
    "plant": "5E03",
    "unitName": "KEBUN SUNGAI DEKAN",
    "noHp": "82352103314",
    "role": "USER"
  },
  {
    "nik": "13006880",
    "name": "SUDI SUPRAMONO",
    "jabatan": "KRANI I TANAMAN",
    "plant": "5E03",
    "unitName": "KEBUN SUNGAI DEKAN",
    "noHp": "82253493250",
    "role": "USER"
  },
  {
    "nik": "13003583",
    "name": "AGAPITUS ANDUS",
    "jabatan": "KRANI FINANSIL",
    "plant": "5E04",
    "unitName": "KEBUN RIMBA BELIAN",
    "noHp": "82358092312",
    "role": "USER"
  },
  {
    "nik": "13005060",
    "name": "AODA NARAFIKA",
    "jabatan": "KRANI TEKNIK",
    "plant": "5E04",
    "unitName": "KEBUN RIMBA BELIAN",
    "noHp": "81255998722",
    "role": "USER"
  },
  {
    "nik": "13002025",
    "name": "SUNGGUL SITORUS",
    "jabatan": "KRANI UPAH",
    "plant": "5E04",
    "unitName": "KEBUN RIMBA BELIAN",
    "noHp": "82154930024",
    "role": "USER"
  },
  {
    "nik": "13003308",
    "name": "ADI KUSNANTO",
    "jabatan": "KRANI PEMBUKUAN",
    "plant": "5E04",
    "unitName": "KEBUN RIMBA BELIAN",
    "noHp": "85389981622",
    "role": "USER"
  },
  {
    "nik": "13000665",
    "name": "SUPARMAN",
    "jabatan": "KRANI TANAMAN",
    "plant": "5E04",
    "unitName": "KEBUN RIMBA BELIAN",
    "noHp": "82154708235",
    "role": "USER"
  },
  {
    "nik": "13005772",
    "name": "BENI SUPRIADI SIREGAR",
    "jabatan": "KRANI ANGGARAN DAN PEMBUKUAN",
    "plant": "5E07",
    "unitName": "KEBUN NGABANG",
    "noHp": "85345003284",
    "role": "USER"
  },
  {
    "nik": "13004218",
    "name": "FX MARYADI",
    "jabatan": "KRANI I TUK",
    "plant": "5E07",
    "unitName": "KEBUN NGABANG",
    "noHp": "85251530877",
    "role": "USER"
  },
  {
    "nik": "13004201",
    "name": "BAMBANG IRAWAN",
    "jabatan": "KRANI KAS BANK/FINANSIL",
    "plant": "5E07",
    "unitName": "KEBUN NGABANG",
    "noHp": "85751204038",
    "role": "USER"
  },
  {
    "nik": "13002001",
    "name": "SUSANTI",
    "jabatan": "KRANI I TEKNIK",
    "plant": "5E07",
    "unitName": "KEBUN NGABANG",
    "noHp": "81250381094",
    "role": "USER"
  },
  {
    "nik": "13002058",
    "name": "NATALIS",
    "jabatan": "KRANI I TATA USAHA",
    "plant": "5E08",
    "unitName": "KEBUN PARINDU",
    "noHp": "82256871255",
    "role": "USER"
  },
  {
    "nik": "13004096",
    "name": "BENYAMIN",
    "jabatan": "KRANI I TEHNIK",
    "plant": "5E08",
    "unitName": "KEBUN PARINDU",
    "noHp": "83152651832",
    "role": "USER"
  },
  {
    "nik": "13005838",
    "name": "VALENTINE QUEEN CHINTARY",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5E08",
    "unitName": "KEBUN PARINDU",
    "noHp": "82352523096",
    "role": "USER"
  },
  {
    "nik": "13005827",
    "name": "ANDRE SHANDRA ANGGARA",
    "jabatan": "KRANI PRODUKSI",
    "plant": "5E08",
    "unitName": "KEBUN PARINDU",
    "noHp": "82158341754",
    "role": "USER"
  },
  {
    "nik": "13002319",
    "name": "PARMIN",
    "jabatan": "KRANI I TEKNIK",
    "plant": "5E09",
    "unitName": "KEBUN KEMBAYAN",
    "noHp": "82254608775",
    "role": "USER"
  },
  {
    "nik": "13006457",
    "name": "LIZA AGUSTHA",
    "jabatan": "KRANI  I KEUANGAN DAN ANGGARAN",
    "plant": "5E09",
    "unitName": "KEBUN KEMBAYAN",
    "noHp": "82154370005",
    "role": "USER"
  },
  {
    "nik": "13001455",
    "name": "BIANA RITI",
    "jabatan": "KRANI TATA UPAH",
    "plant": "5E09",
    "unitName": "KEBUN KEMBAYAN",
    "noHp": "81345158373",
    "role": "USER"
  },
  {
    "nik": "13002392",
    "name": "SUDARSIN",
    "jabatan": "KRANI  I TANAMAN",
    "plant": "5E09",
    "unitName": "KEBUN KEMBAYAN",
    "noHp": "81352291495",
    "role": "USER"
  },
  {
    "nik": "19003382",
    "name": "ERIX HARIYANTO",
    "jabatan": "KRANI FINANSIAL",
    "plant": "5E11",
    "unitName": "KEBUN DANAU SALAK",
    "noHp": "85750103274",
    "role": "USER"
  },
  {
    "nik": "13007155",
    "name": "BANJAR ARIES DWI PUTRA",
    "jabatan": "KRANI DOKUMEN SISTEM DAN SERTIFIKASI",
    "plant": "5E11",
    "unitName": "KEBUN DANAU SALAK",
    "noHp": "81256446405",
    "role": "USER"
  },
  {
    "nik": "19003381",
    "name": "DIMAS PRATAMA WICAKSONO",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5E11",
    "unitName": "KEBUN DANAU SALAK",
    "noHp": "85822206582",
    "role": "USER"
  },
  {
    "nik": "13002218",
    "name": "MARYANTO",
    "jabatan": "KRANI TANAMAN",
    "plant": "5E11",
    "unitName": "KEBUN DANAU SALAK",
    "noHp": "82159846525",
    "role": "USER"
  },
  {
    "nik": "13004578",
    "name": "YANTO",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5E12",
    "unitName": "\\KEBUN KUMAI KARET",
    "noHp": "85845431851",
    "role": "USER"
  },
  {
    "nik": "13003943",
    "name": "ARI HIMAWAN",
    "jabatan": "KRANI I TANAMAN",
    "plant": "5E13",
    "unitName": "KEBUN BATULICIN",
    "noHp": "82157755981",
    "role": "USER"
  },
  {
    "nik": "13004582",
    "name": "TUTIK HANDAYANI",
    "jabatan": "KRANI TATA UPAH",
    "plant": "5E13",
    "unitName": "KEBUN BATULICIN",
    "noHp": "85820878728",
    "role": "USER"
  },
  {
    "nik": "13005788",
    "name": "FENDI",
    "jabatan": "KRANI AKUNTASI",
    "plant": "5E13",
    "unitName": "KEBUN BATULICIN",
    "noHp": "82251854131",
    "role": "USER"
  },
  {
    "nik": "13005842",
    "name": "TUTIK ASRIYATI",
    "jabatan": "KRANI PERSONALIA",
    "plant": "5E14",
    "unitName": "KEBUN PAMUKAN",
    "noHp": "85251993822",
    "role": "USER"
  },
  {
    "nik": "13004610",
    "name": "IRVAN JUNAEDY",
    "jabatan": "KRANI TANAMAN",
    "plant": "5E14",
    "unitName": "KEBUN PAMUKAN",
    "noHp": "81349669181",
    "role": "USER"
  },
  {
    "nik": "13004446",
    "name": "M. ANSORI",
    "jabatan": "KRANI I TATA USAHA",
    "plant": "5E14",
    "unitName": "KEBUN PAMUKAN",
    "noHp": "81254459683",
    "role": "USER"
  },
  {
    "nik": "13004680",
    "name": "SUBEKTI KRIDA ASMARA",
    "jabatan": "KRANI GUDANG",
    "plant": "5E14",
    "unitName": "KEBUN PAMUKAN",
    "noHp": "85347829595",
    "role": "USER"
  },
  {
    "nik": "13008070",
    "name": "SAFITRI",
    "jabatan": "KRANI PERSONALIA",
    "plant": "5E14",
    "unitName": "KEBUN PAMUKAN",
    "noHp": "85754147562",
    "role": "USER"
  },
  {
    "nik": "13003891",
    "name": "DARYANTO",
    "jabatan": "KRANI I TANAMAN",
    "plant": "5E14",
    "unitName": "KEBUN PAMUKAN",
    "noHp": "81645442755",
    "role": "USER"
  },
  {
    "nik": "13004685",
    "name": "CHATUR WIRI WULANDARI",
    "jabatan": "KRANI I TATA USAHA",
    "plant": "5E15",
    "unitName": "KEBUN PELAIHARI",
    "noHp": "85248067988",
    "role": "USER"
  },
  {
    "nik": "13004696",
    "name": "LAILA NUR GEMILANG",
    "jabatan": "KRANI UPAH",
    "plant": "5E15",
    "unitName": "KEBUN PELAIHARI",
    "noHp": "81348143209",
    "role": "USER"
  },
  {
    "nik": "13004672",
    "name": "ANDRIYANI ANWAR",
    "jabatan": "KRANI I TANAMAN",
    "plant": "5E15",
    "unitName": "KEBUN PELAIHARI",
    "noHp": "85248050548",
    "role": "USER"
  },
  {
    "nik": "13002914",
    "name": "SRIYANTO",
    "jabatan": "KRANI 1 TUK",
    "plant": "5E16",
    "unitName": "KEBUN TABARA",
    "noHp": "82350338689",
    "role": "USER"
  },
  {
    "nik": "13002648",
    "name": "NANIN YUNI ANDANSARI",
    "jabatan": "KRANI GAJI",
    "plant": "5E16",
    "unitName": "KEBUN TABARA",
    "noHp": "81350760905",
    "role": "USER"
  },
  {
    "nik": "13003226",
    "name": "JAHIDUN",
    "jabatan": "KRANI I TANAMAN",
    "plant": "5E16",
    "unitName": "KEBUN TABARA",
    "noHp": "81549120391",
    "role": "USER"
  },
  {
    "nik": "13007728",
    "name": "ENJELINA BARUTU",
    "jabatan": "KRANI KEUANGAN DAN ANGGARAN",
    "plant": "5E17",
    "unitName": "KEBUN TAJATI",
    "noHp": "82151518519",
    "role": "USER"
  },
  {
    "nik": "13006850",
    "name": "ABDUL KARIM, AHMAD FIRDAUS",
    "jabatan": "KRANI FINANSIAL, KRANI TEKNIK",
    "plant": "5E17",
    "unitName": "KEBUN TAJATI",
    "noHp": "81350870575",
    "role": "USER"
  },
  {
    "nik": "13007723",
    "name": "RENNY FAUZIAH RAHMAN",
    "jabatan": "KRANI PERSONALIA",
    "plant": "5E17",
    "unitName": "KEBUN TAJATI",
    "noHp": "85156618833",
    "role": "USER"
  },
  {
    "nik": "13005431",
    "name": "TURYONO",
    "jabatan": "KRANI PRODUKSI TANAMAN",
    "plant": "5E17",
    "unitName": "KEBUN TAJATI",
    "noHp": "85750309701",
    "role": "USER"
  },
  {
    "nik": "13005789",
    "name": "NURJANAH",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5E18",
    "unitName": "KEBUN PANDAWA",
    "noHp": "87774265921",
    "role": "USER"
  },
  {
    "nik": "13004130",
    "name": "NENENG AWALIAH",
    "jabatan": "KRANI I PERSONALIA",
    "plant": "5E18",
    "unitName": "KEBUN PANDAWA",
    "noHp": "85246340464",
    "role": "USER"
  },
  {
    "nik": "13002614",
    "name": "KHAIRUL FUAD",
    "jabatan": "KRANI I TUK",
    "plant": "5E18",
    "unitName": "KEBUN PANDAWA",
    "noHp": "8125471351",
    "role": "USER"
  },
  {
    "nik": "13006140",
    "name": "EKO WIDIYONO",
    "jabatan": "KRANI GUDANG",
    "plant": "5E18",
    "unitName": "KEBUN PANDAWA",
    "noHp": "81347194142",
    "role": "USER"
  },
  {
    "nik": "13003940",
    "name": "MARSELUS SABAN",
    "jabatan": "KRANI TANAMAN",
    "plant": "5E18",
    "unitName": "KEBUN PANDAWA",
    "noHp": "81351972894",
    "role": "USER"
  },
  {
    "nik": "13005427",
    "name": "SAINUDIN",
    "jabatan": "KRANI I TANAMAN",
    "plant": "5E18",
    "unitName": "KEBUN PANDAWA",
    "noHp": "85246204000",
    "role": "USER"
  },
  {
    "nik": "13004561",
    "name": "SURIANI",
    "jabatan": "KERANI AKUNTANSI",
    "plant": "5E19",
    "unitName": "KEBUN LONGKALI",
    "noHp": "85787637022",
    "role": "USER"
  },
  {
    "nik": "13001667",
    "name": "JURIAH ERNA",
    "jabatan": "KERANI GAJI",
    "plant": "5E19",
    "unitName": "KEBUN LONGKALI",
    "noHp": "82158011245",
    "role": "USER"
  },
  {
    "nik": "13002332",
    "name": "MAR'ATUS SHOLIHAH",
    "jabatan": "PEMB. KRANI GUDANG",
    "plant": "5E19",
    "unitName": "KEBUN LONGKALI",
    "noHp": "81253830175",
    "role": "USER"
  },
  {
    "nik": "13005155",
    "name": "NUNUNG NURHASANAH",
    "jabatan": "KERANI TANAMAN",
    "plant": "5E19",
    "unitName": "KEBUN LONGKALI",
    "noHp": "92148987022",
    "role": "USER"
  },
  {
    "nik": "13003533",
    "name": "PUNANTO",
    "jabatan": "KRANI FINANSIL",
    "plant": "5F01",
    "unitName": "PABRIK GUNUNG MELIAU",
    "noHp": "82354075943",
    "role": "USER"
  },
  {
    "nik": "13007604",
    "name": "MAKSUM NUR HAMAN",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5F01",
    "unitName": "PABRIK GUNUNG MELIAU",
    "noHp": "85325710431",
    "role": "USER"
  },
  {
    "nik": "13003381",
    "name": "GOODMAN ARITONANG",
    "jabatan": "KRANI PRODUKSI",
    "plant": "5F01",
    "unitName": "PABRIK GUNUNG MELIAU",
    "noHp": "85752483797",
    "role": "USER"
  },
  {
    "nik": "13004832",
    "name": "EMILIUS EKO HERMANTO",
    "jabatan": "KRANI ADMINISTRASI",
    "plant": "5D01",
    "unitName": "Distrik Kalbar",
    "noHp": "82353569877",
    "role": "USER"
  },
  {
    "nik": "13002462",
    "name": "SIMON LUMBANTORUAN",
    "jabatan": "KRANI ADMINISTRASI",
    "plant": "5D01",
    "unitName": "Distrik Kalbar",
    "noHp": "82154458485",
    "role": "USER"
  },
  {
    "nik": "13005653",
    "name": "ARIANTO",
    "jabatan": "KRANI KEUANGAN & ANGGARAN",
    "plant": "5F04",
    "unitName": "PABRIK RIMBA BELIAN",
    "noHp": "82153883005",
    "role": "USER"
  },
  {
    "nik": "13003282",
    "name": "PERIANG SIBURIAN",
    "jabatan": "KRANI UPAH",
    "plant": "5F04",
    "unitName": "PABRIK RIMBA BELIAN",
    "noHp": "81250224318",
    "role": "USER"
  },
  {
    "nik": "13005646",
    "name": "FRANSISKUS",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5F04",
    "unitName": "PABRIK RIMBA BELIAN",
    "noHp": "85332534740",
    "role": "USER"
  },
  {
    "nik": "13004270",
    "name": "MUHIDIN",
    "jabatan": "KRANI PRODUKSI",
    "plant": "5F04",
    "unitName": "PABRIK RIMBA BELIAN",
    "noHp": "82150051581",
    "role": "USER"
  },
  {
    "nik": "13007645",
    "name": "MUHAMMAD FAKHRUR RIZAL",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5F07",
    "unitName": "PABRIK NGABANG",
    "noHp": "85155272285",
    "role": "USER"
  },
  {
    "nik": "13001876",
    "name": "IGNARIKUS",
    "jabatan": "KRANI 1 TATA USAHA",
    "plant": "5F07",
    "unitName": "PABRIK NGABANG",
    "noHp": "85349354262",
    "role": "USER"
  },
  {
    "nik": "13006656",
    "name": "LORIANUS",
    "jabatan": "KRANI SORTASI",
    "plant": "5F07",
    "unitName": "PABRIK NGABANG",
    "noHp": "81258113851",
    "role": "USER"
  },
  {
    "nik": "13007172",
    "name": "ANTONIUS WELY",
    "jabatan": "KRANI FINANSIL",
    "plant": "5F07",
    "unitName": "PABRIK NGABANG",
    "noHp": "82151283959",
    "role": "USER"
  },
  {
    "nik": "19009900",
    "name": "SILVIA APRIANDANI",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5F08",
    "unitName": "PABRIK PARINDU",
    "noHp": "81528579621",
    "role": "USER"
  },
  {
    "nik": "19009901",
    "name": "DEONESIUS DEO ANDERSON",
    "jabatan": "KRANI UPAH",
    "plant": "5F08",
    "unitName": "PABRIK PARINDU",
    "noHp": "85753350049",
    "role": "USER"
  },
  {
    "nik": "13004077",
    "name": "MOHAMAD HABIB WIBOWO",
    "jabatan": "KRANI PP/QM (PRODUKSI)",
    "plant": "5F08",
    "unitName": "PABRIK PARINDU",
    "noHp": "83140086938",
    "role": "USER"
  },
  {
    "nik": "13005719",
    "name": "YOHANES K. DESMAN",
    "jabatan": "KRANI INVENTORY",
    "plant": "5F09",
    "unitName": "PABRIK KEMBAYAN",
    "noHp": "85845892917",
    "role": "USER"
  },
  {
    "nik": "13005802",
    "name": "M.NUR SETO",
    "jabatan": "KRANI I TATA UPAH",
    "plant": "5F09",
    "unitName": "PABRIK KEMBAYAN",
    "noHp": "81545022078",
    "role": "USER"
  },
  {
    "nik": "13004821",
    "name": "F. NANDO",
    "jabatan": "KRANI PRODUKSI",
    "plant": "5F09",
    "unitName": "PABRIK KEMBAYAN",
    "noHp": "82114786869",
    "role": "USER"
  },
  {
    "nik": "13004944",
    "name": "SAPRIYADI",
    "jabatan": "KRANI GUDANG",
    "plant": "5F15",
    "unitName": "PABRIK PELAIHARI",
    "noHp": "81346800963",
    "role": "USER"
  },
  {
    "nik": "13004704",
    "name": "RAHMIDA",
    "jabatan": "KRANI UPAH",
    "plant": "5F15",
    "unitName": "PABRIK PELAIHARI",
    "noHp": "85386610111",
    "role": "USER"
  },
  {
    "nik": "13001173",
    "name": "HUSNI",
    "jabatan": "KRANI PEMBUKUAN",
    "plant": "5F20",
    "unitName": "PKR TAMBARANGAN",
    "noHp": "87700042694",
    "role": "USER"
  },
  {
    "nik": "13003982",
    "name": "MULYADI",
    "jabatan": "KRANI 1 TUK",
    "plant": "5F21",
    "unitName": "PABRIK SAMUNTAI",
    "noHp": "85247471153",
    "role": "USER"
  },
  {
    "nik": "13007905",
    "name": "SONYA SARON KUSUMAWATI SAMPURNO",
    "jabatan": "KRANI PERSONALIA",
    "plant": "5F21",
    "unitName": "PABRIK SAMUNTAI",
    "noHp": "82149058531",
    "role": "USER"
  },
  {
    "nik": "13003992",
    "name": "RUDIANTO",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5F21",
    "unitName": "PABRIK SAMUNTAI",
    "noHp": "85245607252",
    "role": "USER"
  },
  {
    "nik": "13002121",
    "name": "AGUS WIDODO",
    "jabatan": "KRANI AKUNTANSI",
    "plant": "5F22",
    "unitName": "PABRIK LONG PINANG",
    "noHp": "85247176852",
    "role": "USER"
  },
  {
    "nik": "13007939",
    "name": "SITI NURGIATI",
    "jabatan": "KRANI LABORATORIUM",
    "plant": "5F22",
    "unitName": "PABRIK LONG PINANG",
    "noHp": "81549209355",
    "role": "USER"
  },
  {
    "nik": "13007934",
    "name": "DWI SEPTANURLIASARI",
    "jabatan": "KRANI PEMBUKUAN",
    "plant": "5F22",
    "unitName": "PABRIK LONG PINANG",
    "noHp": "83152130269",
    "role": "USER"
  },
  {
    "nik": "13003755",
    "name": "YUSTINUS MARIUS",
    "jabatan": "KERANI KEUANGAN DAN ANGGARAN",
    "plant": "5D01",
    "unitName": "Distrik Kalbar",
    "noHp": "85245581639",
    "role": "USER"
  },
  {
    "nik": "13005506",
    "name": "DIAN FIRDAUS",
    "jabatan": "KRANI KEUANGAN DAN ANGGARAN",
    "plant": "5D03",
    "unitName": "Distrik Kalselteng",
    "noHp": "82255167401",
    "role": "USER"
  },
  {
    "nik": "13004691",
    "name": "ASTERINA",
    "jabatan": "KRANI SEKRETARIAT",
    "plant": "5D03",
    "unitName": "Distrik Kalselteng",
    "noHp": "82255692261",
    "role": "USER"
  },
  {
    "nik": "13006701",
    "name": "RISTIAWATI",
    "jabatan": "KERANI KEUANGAN",
    "plant": "5D02",
    "unitName": "Distrik Kaltim",
    "noHp": "85246659844",
    "role": "USER"
  },
  {
    "nik": "13004080",
    "name": "SUJOKO",
    "jabatan": "KERANI AKUNTASI",
    "plant": "5D02",
    "unitName": "Distrik Kaltim",
    "noHp": "82114762271",
    "role": "USER"
  }
];

async function main() {
  console.log("\n=== IMPORT USER DARI EXCEL ===");
  console.log(`Total dari Excel: ${EXCEL_USERS.length} users`);
  if (DRY_RUN) console.log("??  DRY RUN ? tidak ada data yang ditulis\n");

  // Fetch existing users
  const { data: existing, error: fetchErr } = await supabase
    .from("app_users")
    .select("nik, name, role, plant");
  
  if (fetchErr) {
    console.error("? Gagal ambil data dari DB:", fetchErr.message);
    process.exit(1);
  }
  
  const existingNiks = new Map(existing.map(u => [u.nik, u]));
  console.log(`Users di DB saat ini: ${existing.length}`);

  const toInsert = [];
  const toSkip = [];
  const toProtect = [];

  for (const user of EXCEL_USERS) {
    if (PROTECTED_NIKS.has(user.nik)) {
      toProtect.push(user);
      continue;
    }
    if (existingNiks.has(user.nik)) {
      toSkip.push(user);
    } else {
      toInsert.push({ ...user, password: "123" });
    }
  }

  console.log(`\n?? Akan diinsert: ${toInsert.length} user baru`);
  console.log(`??  Sudah ada (skip): ${toSkip.length}`);
  console.log(`?? Protected (skip): ${toProtect.length}`);

  if (toInsert.length === 0) {
    console.log("\n? Semua user sudah ada di DB. Tidak ada yang perlu diinsert.");
    return;
  }

  console.log("\n?? Users yang akan diinsert:");
  toInsert.forEach(u => console.log(`  ${u.nik} | ${u.name} | ${u.plant} | ${u.role}`));

  if (!DRY_RUN) {
    const { error } = await supabase.from("app_users").insert(toInsert);
    if (error) {
      console.error("\n? Insert gagal:", error.message);
    } else {
      console.log(`\n? Berhasil insert ${toInsert.length} users!`);
    }
  } else {
    console.log("\n[DRY RUN] - tidak ada perubahan ke DB");
  }
}

main().catch(console.error);
