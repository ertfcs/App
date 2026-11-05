"""Biglietti/orari indicativi (verificati nov 2026) per i luoghi del catalogo.
Applicati all'avvio SOLO ai campi vuoti: le modifiche fatte dall'admin restano."""

FREE_SUNDAY = "Gratis la 1ª domenica del mese (siti regionali)"

POI_TICKETS = {
    "Cattedrale di Palermo": {
        "price": "Chiesa gratis · Tetti €7 (11–17 anni €4) · Area monumentale €8–13 · Pass completo fino a €18",
        "hours": "Apr–ott lun–sab 9:30–18:00, dom 10:00–18:00 (orari ridotti in inverno)",
        "ticket_url": "https://www.ticket-shop-cattedraledipalermo.it",
        "notes": "Acquista solo sul sito ufficiale o in biglietteria.",
    },
    "Palazzo dei Normanni e Cappella Palatina": {
        "price": "€19 (18–25 anni €17, over 65 €15,50, 14–17 anni €11)",
        "hours": "Lun–sab 8:30–16:30, dom e festivi 8:30–12:30 (verificare le chiusure infrasettimanali)",
        "ticket_url": "https://www.federicosecondo.org",
        "duration": "1–2 ore",
    },
    "Teatro Massimo": {
        "price": "Visita guidata €14 (under 26 €7, famiglia €36)",
        "hours": "Tutti i giorni 9:30–18:00 (apr–ott fino alle 19:00)",
        "ticket_url": "https://www.teatromassimo.it/visite-guidate/",
        "duration": "40 min",
    },
    "Catacombe dei Cappuccini": {
        "price": "€5 (ridotto €3)",
        "hours": "9:00–12:30 e 15:00–17:30",
        "notes": "Biglietti solo in loco: non esistono rivenditori online autorizzati.",
    },
    "Duomo di Monreale": {
        "price": "Cattedrale + terrazze + museo €6 · Chiostro €8 (ridotto €4) · Cumulativo €12",
        "ticket_url": "https://www.coopculture.it",
        "discount": "Chiostro: " + FREE_SUNDAY,
    },
    "Duomo di Cefalù": {
        "price": "Chiesa gratis · Itinerario completo €13 · Torri e tetti €10 · Tesoro e chiostro €10",
        "notes": "I biglietti includono l'Osterio Magno.",
    },
    "La Rocca di Cefalù": {
        "price": "€5 (6–14 anni e over 65 €2,50)",
        "notes": "Biglietteria in Via Pitrè; vietati sandali e suole lisce.",
        "duration": "2 ore",
    },
    "Villa Palagonia": {"price": "€6 (gruppi da 20 persone €3)", "duration": "1 ora"},
    "Castello di Carini": {
        "price": "€5 (ridotto €3: 6–18 anni, over 65)",
        "hours": "Giu–set tutti i giorni 9:00–13:00 e 15:00–19:00",
    },
    "Tempio di Segesta": {
        "price": "€14 (ridotto €7) · €16/€9 con mostre in corso",
        "discount": FREE_SUNDAY,
        "ticket_url": "https://parchiarcheologici.regione.sicilia.it/segesta/biglietti/",
        "notes": "Un solo biglietto per tempio e teatro; navetta interna per il teatro a pagamento.",
    },
    "Teatro greco di Segesta": {
        "price": "Incluso nel biglietto del Parco di Segesta (€14, ridotto €7)",
        "discount": FREE_SUNDAY,
        "ticket_url": "https://parchiarcheologici.regione.sicilia.it/segesta/biglietti/",
    },
    "Parco archeologico di Selinunte": {
        "price": "€17 (ridotto €10), incluso supplemento mostra €3",
        "discount": FREE_SUNDAY,
        "ticket_url": "https://parchiarcheologici.regione.sicilia.it/selinunte-cave-cusa-pantelleria/biglietti/",
        "duration": "mezza giornata",
    },
    "Cave di Cusa": {"price": "€2 (ridotto €1)", "hours": "Ora legale 9:00–19:00 (biglietteria fino alle 18:00)", "discount": FREE_SUNDAY},
    "Museo del Satiro Danzante": {"price": "€8 (ridotto €4)", "discount": FREE_SUNDAY},
    "Area archeologica di Solunto": {"price": "€6 (ridotto €3)", "discount": FREE_SUNDAY},
    "Himera - Parco archeologico": {"price": "€6 (ridotto €3)", "discount": FREE_SUNDAY},
    "Palazzo Abatellis (Galleria Regionale)": {"price": "€10", "discount": FREE_SUNDAY},
    "Museo Archeologico Salinas": {"price": "€8", "discount": FREE_SUNDAY},
    "Palazzo della Zisa": {"price": "€8", "discount": FREE_SUNDAY},
    "San Giovanni degli Eremiti": {"price": "€8", "discount": FREE_SUNDAY},
    "Chiesa della Martorana": {"price": "€4 (€3 con il Circuito del Sacro)"},
    "Palazzo Chiaramonte-Steri": {"price": "€8 (ridotto €5) · con Orto Botanico €12", "ticket_url": "https://www.coopculture.it"},
    "Orto Botanico di Palermo": {"price": "€8 · con Steri €12 · con Salinas e Museo Doderlein €13", "ticket_url": "https://www.coopculture.it"},
    "Museo del Carretto Siciliano (Terrasini)": {
        "price": "Palazzo d'Aumale €8 (18–25 anni UE €4, gratis under 18)",
        "hours": "Mar–sab 9:00–19:00, dom 9:00–13:00; lunedì chiuso",
        "discount": FREE_SUNDAY,
    },
    "Borgo medievale di Erice": {
        "price": "Ingresso libero · Funivia da Trapani €9 corsa singola, €15 A/R",
        "ticket_url": "https://funiviaerice.skiperformance.com",
        "notes": "La funivia è chiusa il lunedì mattina per manutenzione.",
    },
    "Castello di Venere (Erice)": {
        "price": "€5 · Integrato €10 (Museo Cordici, Torretta Pepoli, Quartiere Spagnolo, Erice in Miniatura) · Erice Card €15",
        "hours": "Apr–ott 10:00–18:00 (lug e set fino alle 19:00, ago fino alle 20:00); nov–mar solo sabato e festivi",
    },
    "Isola di Mozia (Mothia)": {
        "price": "Isola e museo €12 (ragazzi €6) + barca ~€3,50",
        "ticket_url": "https://www.fondazionewhitaker.it",
        "notes": "Barche dagli imbarcaderi dello Stagnone ogni 30 minuti circa.",
    },
    "Cantine storiche di Marsala": {
        "price": "Cantine Florio: visita con degustazione da €25 (solo su prenotazione)",
        "ticket_url": "https://visit.cantineflorio.it",
    },
    "Riserva dello Zingaro": {
        "price": "€5 (ridotto €3)",
        "ticket_url": "https://www.riservanaturalezingaro.com/info-utili/",
        "notes": "Solo pagamento elettronico, niente contanti.",
    },
    "Cala dell'Uzzo (Zingaro)": {
        "price": "Ingresso Riserva dello Zingaro €5 (ridotto €3)",
        "notes": "Solo pagamento elettronico, niente contanti.",
    },
    "Torre di Ligny": {
        "price": "€3 (ridotto €2)",
        "hours": "Ott–mag 10:00–13:00 e 15:30–18:00; lug–set 10:00–13:00 e 17:00–21:00",
        "notes": "Può chiudere per maltempo.",
    },
    "Grotta Mangiapane (Custonaci)": {
        "price": "A pagamento (ridotto 4–10 anni, gratis 0–3 anni)",
        "hours": "10:00–18:00; dal 1 maggio al 31 agosto 10:00–20:00",
        "ticket_url": "https://www.liveticket.it/grottamangiapane",
    },
    "Spiaggia di Scopello e Faraglioni": {
        "notes": "Da fine settembre 2026 la Tonnara di Scopello non accoglie visitatori e la balneazione ai Faraglioni è vietata da ordinanza: verificare prima di andare.",
    },
}

TICKET_FIELDS = ("price", "hours", "discount", "ticket_url", "notes", "duration")


async def apply_poi_tickets(db) -> int:
    updated = 0
    for name, info in POI_TICKETS.items():
        doc = await db.pois.find_one({"name": name}, {"_id": 0})
        if not doc:
            continue
        patch = {k: v for k, v in info.items() if k in TICKET_FIELDS and not doc.get(k)}
        if patch:
            await db.pois.update_one({"name": name}, {"$set": patch})
            updated += 1
    return updated
