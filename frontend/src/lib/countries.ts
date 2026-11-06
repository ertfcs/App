// Paesi (nomi in italiano) con codice ISO per generare la bandiera.
const RAW = `AF Afghanistan|AL Albania|DZ Algeria|AD Andorra|AO Angola|AG Antigua e Barbuda|SA Arabia Saudita|AR Argentina|AM Armenia|AU Australia|AT Austria|AZ Azerbaigian|BS Bahamas|BH Bahrein|BD Bangladesh|BB Barbados|BE Belgio|BZ Belize|BJ Benin|BT Bhutan|BY Bielorussia|BO Bolivia|BA Bosnia ed Erzegovina|BW Botswana|BR Brasile|BN Brunei|BG Bulgaria|BF Burkina Faso|BI Burundi|KH Cambogia|CM Camerun|CA Canada|CV Capo Verde|TD Ciad|CL Cile|CN Cina|CY Cipro|CO Colombia|KM Comore|CG Congo|CD Congo (Rep. Dem.)|KP Corea del Nord|KR Corea del Sud|CI Costa d'Avorio|CR Costa Rica|HR Croazia|CU Cuba|DK Danimarca|DM Dominica|EC Ecuador|EG Egitto|SV El Salvador|AE Emirati Arabi Uniti|ER Eritrea|EE Estonia|SZ Eswatini|ET Etiopia|FJ Figi|PH Filippine|FI Finlandia|FR Francia|GA Gabon|GM Gambia|GE Georgia|DE Germania|GH Ghana|JM Giamaica|JP Giappone|GI Gibilterra|DJ Gibuti|JO Giordania|GR Grecia|GD Grenada|GL Groenlandia|GT Guatemala|GN Guinea|GQ Guinea Equatoriale|GW Guinea-Bissau|GY Guyana|HT Haiti|HN Honduras|HK Hong Kong|IN India|ID Indonesia|IR Iran|IQ Iraq|IE Irlanda|IS Islanda|IL Israele|IT Italia|KZ Kazakistan|KE Kenya|KG Kirghizistan|KI Kiribati|XK Kosovo|KW Kuwait|LA Laos|LS Lesotho|LV Lettonia|LB Libano|LR Liberia|LY Libia|LI Liechtenstein|LT Lituania|LU Lussemburgo|MO Macao|MK Macedonia del Nord|MG Madagascar|MW Malawi|MY Malaysia|MV Maldive|ML Mali|MT Malta|MA Marocco|MH Isole Marshall|MR Mauritania|MU Mauritius|MX Messico|FM Micronesia|MD Moldavia|MC Monaco|MN Mongolia|ME Montenegro|MZ Mozambico|MM Myanmar|NA Namibia|NR Nauru|NP Nepal|NI Nicaragua|NE Niger|NG Nigeria|NO Norvegia|NZ Nuova Zelanda|NL Paesi Bassi|OM Oman|PK Pakistan|PW Palau|PS Palestina|PA Panama|PG Papua Nuova Guinea|PY Paraguay|PE Perù|PL Polonia|PT Portogallo|PR Porto Rico|QA Qatar|GB Regno Unito|CZ Repubblica Ceca|CF Repubblica Centrafricana|DO Repubblica Dominicana|RO Romania|RW Ruanda|RU Russia|KN Saint Kitts e Nevis|LC Saint Lucia|VC Saint Vincent e Grenadine|WS Samoa|SM San Marino|ST São Tomé e Príncipe|SN Senegal|RS Serbia|SC Seychelles|SL Sierra Leone|SG Singapore|SY Siria|SK Slovacchia|SI Slovenia|SB Isole Salomone|SO Somalia|ES Spagna|LK Sri Lanka|US Stati Uniti|ZA Sudafrica|SD Sudan|SS Sudan del Sud|SR Suriname|SE Svezia|CH Svizzera|TJ Tagikistan|TW Taiwan|TZ Tanzania|TH Thailandia|TL Timor Est|TG Togo|TO Tonga|TT Trinidad e Tobago|TN Tunisia|TR Turchia|TM Turkmenistan|TV Tuvalu|UA Ucraina|UG Uganda|HU Ungheria|UY Uruguay|UZ Uzbekistan|VU Vanuatu|VA Città del Vaticano|VE Venezuela|VN Vietnam|YE Yemen|ZM Zambia|ZW Zimbabwe`;

export type Country = { code: string; name: string; flag: string };

export const flagOf = (code: string) =>
  code.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const COUNTRIES: Country[] = RAW.split("|")
  .map((e) => ({ code: e.slice(0, 2), name: e.slice(3), flag: flagOf(e.slice(0, 2)) }))
  .sort((a, b) => a.name.localeCompare(b.name, "it"));

// Paesi più frequenti tra gli ospiti, mostrati per primi.
const TOP = ["IT", "DE", "FR", "GB", "ES", "PL", "NL", "BE", "CH", "US", "AT", "PT"];

export function searchCountries(q: string): Country[] {
  const n = norm(q.trim());
  if (!n) return [...TOP.map((c) => COUNTRIES.find((x) => x.code === c)!), ...COUNTRIES.filter((x) => !TOP.includes(x.code))];
  return COUNTRIES.filter((c) => norm(c.name).includes(n) || c.code.toLowerCase() === n);
}

export const countryByName = (name: string) => COUNTRIES.find((c) => norm(c.name) === norm(name));
