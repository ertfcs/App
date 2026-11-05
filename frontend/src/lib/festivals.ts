// Feste, sagre, santi patroni (tutti i comuni delle province di Palermo e Trapani)
// e festività nazionali/regionali. Le date sono REGOLE ricorrenti calcolate per
// ogni anno (date fisse, Pasqua/Pentecoste, "n-esima domenica"...), così il
// calendario resta corretto anche negli anni successivi.
// Le sagre a data variabile sono marcate `approx`: compaiono comunque sul
// calendario, con l'avviso di verificare le date ufficiali.
export type Province = "PA" | "TP" | "SIC" | "IT";
export type Category = "religiosa" | "sagra" | "folklore" | "nazionale";

export type Festival = {
  id: string;
  name: string;
  place: string;
  province: Province;
  start: string; // ISO
  end: string; // ISO
  dateLabel: string;
  category: Category;
  icon: string;
  description: string;
  curiosity?: string;
  approx?: boolean;
  note?: string;
};

// fixed: giorno fisso · easter: giorni da Pasqua · wd: primo giorno della settimana `wd`
// (0=dom … 6=sab) a partire dal m/d · last: ultimo `wd` del mese.
type Rule =
  | { k: "fixed"; m: number; d: number }
  | { k: "easter"; off: number }
  | { k: "wd"; m: number; d: number; wd: number }
  | { k: "last"; m: number; wd: number };

type Def = Omit<Festival, "id" | "start" | "end" | "dateLabel" | "icon"> & {
  id: string;
  icon?: string;
  rule: Rule;
  days?: number; // durata in giorni (default 1)
  off?: number; // spostamento dell'inizio rispetto alla regola
  when?: string; // es. "Ultima domenica di agosto"
};

const fx = (m: number, d: number): Rule => ({ k: "fixed", m, d });
const ea = (off: number): Rule => ({ k: "easter", off });
const wd = (m: number, d: number, w: number): Rule => ({ k: "wd", m, d, wd: w });
const last = (m: number, w: number): Rule => ({ k: "last", m, wd: w });

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Festa patronale "standard" (descrizione generica se non specificata).
function pat(
  place: string,
  province: "PA" | "TP",
  saint: string,
  rule: Rule,
  extra: Partial<Def> = {}
): Def {
  return {
    id: `${slug(place)}-${slug(saint)}`,
    name: `Festa di ${saint}`,
    place,
    province,
    category: "religiosa",
    description: `Festa patronale di ${place} in onore di ${saint}, con celebrazioni religiose, processione per le vie del paese e festeggiamenti in piazza.`,
    rule,
    ...extra,
  };
}

const ND = (id: string, name: string, rule: Rule, icon: string, description: string, curiosity?: string, province: Province = "IT"): Def => ({
  id, name, place: province === "SIC" ? "Tutta la Sicilia" : "Tutta Italia", province, category: "nazionale", icon, description, curiosity, rule,
});

const VERIFY = "Date indicative: verifica il programma ufficiale sul sito del Comune o della Pro Loco.";

const DEFS: Def[] = [
  // ————— Festività NAZIONALI e REGIONALI —————
  ND("capodanno", "Capodanno", fx(1, 1), "🎆", "Primo giorno dell'anno, festa nazionale: molti negozi e musei sono chiusi o con orari ridotti.", "In Sicilia a mezzanotte non mancano lenticchie e fuochi d'artificio sul mare."),
  ND("epifania", "Epifania", fx(1, 6), "⭐", "Festa nazionale dell'Epifania, chiude le festività natalizie.", "A Piana degli Albanesi si celebra la Teofania con il rito bizantino della benedizione delle acque."),
  ND("pasqua", "Pasqua", ea(0), "🕊️", "Domenica di Pasqua: nei paesi delle due province si svolgono riti e processioni tra i più antichi della Sicilia.", "Dolce simbolo: l'agnello pasquale di pasta di mandorla."),
  ND("pasquetta", "Lunedì dell'Angelo (Pasquetta)", ea(1), "🧺", "Festa nazionale: giornata tradizionale di gite e scampagnate.", "I siciliani la passano al mare o in campagna con la grigliata."),
  ND("liberazione", "Festa della Liberazione", fx(4, 25), "🇮🇹", "Anniversario della Liberazione, festa nazionale."),
  ND("lavoro", "Festa dei Lavoratori", fx(5, 1), "🇮🇹", "Primo maggio, festa nazionale.", "Giornata di gite fuori porta: le spiagge e le riserve sono molto frequentate."),
  ND("autonomia-siciliana", "Festa dell'Autonomia Siciliana", fx(5, 15), "🟡", "Anniversario dello Statuto speciale della Regione Siciliana (15 maggio 1946).", "Uffici regionali chiusi; i servizi comunali e statali restano regolari.", "SIC"),
  ND("repubblica", "Festa della Repubblica", fx(6, 2), "🇮🇹", "Anniversario del referendum del 1946, festa nazionale."),
  ND("ferragosto", "Ferragosto · Assunzione di Maria", fx(8, 15), "☀️", "Festa nazionale dell'Assunta: il giorno più affollato dell'estate su spiagge e lungomari.", "A Trappeto la Madonna Assunta viene portata in processione a mare nel golfo."),
  ND("san-francesco", "San Francesco d'Assisi, patrono d'Italia", fx(10, 4), "🇮🇹", "Dal 2026 il 4 ottobre è tornato festa nazionale in onore del patrono d'Italia."),
  ND("ognissanti", "Ognissanti", fx(11, 1), "🕯️", "Festa nazionale di Tutti i Santi."),
  ND("festa-dei-morti", "Festa dei Morti", fx(11, 2), "🍬", "Commemorazione dei defunti: in Sicilia è una festa per i bambini, che ricevono doni 'portati dai morti'.", "Si preparano frutta martorana, pupi di zucchero, ossa di morto e il 'cannistro'.", "SIC"),
  ND("immacolata", "Immacolata Concezione", fx(12, 8), "⛪", "Festa nazionale dell'Immacolata; apre il periodo natalizio. È anche patrona di Cefalù (con il SS. Salvatore).", "In molte famiglie palermitane si fa l'albero e si mangia lo sfincione."),
  ND("natale", "Natale", fx(12, 25), "🎄", "Festa nazionale: presepi viventi, novene e tavole imbandite in tutta l'isola.", "Dolci tipici: buccellato, cassata e cannoli."),
  ND("santo-stefano", "Santo Stefano", fx(12, 26), "🎁", "Festa nazionale. È anche il patrono di Campofiorito (PA)."),
  ND("san-silvestro", "San Silvestro · Notte di Capodanno", fx(12, 31), "🥂", "Ultimo giorno dell'anno: concerti in piazza e fuochi d'artificio a Palermo, Trapani e nei borghi costieri.", "Non è festa nazionale: negozi e servizi sono aperti, spesso con chiusura anticipata."),

  // ————— Provincia di PALERMO · Patroni di tutti gli 82 comuni —————
  pat("Alia", "PA", "Maria SS. delle Grazie", fx(7, 2)),
  pat("Alimena", "PA", "Santa Maria Maddalena", fx(9, 1)),
  pat("Aliminusa", "PA", "Sant'Anna", fx(7, 26)),
  pat("Altavilla Milicia", "PA", "Madonna della Milicia", fx(9, 8), { name: "Madonna della Milicia", description: "Festa mariana con la venerata immagine di Maria SS. della Milicia, tra fede e folklore.", curiosity: "Il santuario è meta di pellegrinaggio da tutta la Sicilia occidentale." }),
  pat("Altofonte", "PA", "Sant'Anna", fx(7, 26)),
  pat("Bagheria", "PA", "San Giuseppe", fx(3, 19), { curiosity: "Bagheria è celebre per le sue splendide ville barocche settecentesche.", note: "I grandi festeggiamenti esterni si tengono in estate/inizio autunno a data variabile (nel 2026: 21–28 settembre, per il bicentenario della città)." }),
  pat("Balestrate", "PA", "Maria SS. Addolorata", fx(9, 15)),
  pat("Baucina", "PA", "Santa Fortunata", fx(2, 14)),
  pat("Baucina", "PA", "San Marco", fx(4, 25), { description: "Seconda festa patronale di Baucina, in onore di San Marco evangelista." }),
  pat("Belmonte Mezzagno", "PA", "SS. Crocifisso", fx(9, 14), { name: "Festa del SS. Crocifisso" }),
  pat("Bisacquino", "PA", "Santa Rosalia", fx(9, 4)),
  pat("Blufi", "PA", "Madonna dell'Olio", ea(51), { when: "Martedì dopo Pentecoste" }),
  pat("Bolognetta", "PA", "Sant'Antonio da Padova", fx(6, 13)),
  pat("Bompietro", "PA", "Madonna delle Grazie", fx(8, 25), { days: 2 }),
  pat("Borgetto", "PA", "Santa Maria Maddalena", fx(7, 22)),
  pat("Caccamo", "PA", "San Giorgio, San Nicasio e Beato Giovanni Liccio", last(5, 1), { name: "Festa dei Santi Patroni", when: "Ultimo lunedì di maggio", approx: true, note: VERIFY, curiosity: "Caccamo è dominata da uno dei castelli medievali più grandi di Sicilia." }),
  pat("Caltavuturo", "PA", "Maria SS. del Soccorso", fx(9, 10)),
  pat("Campofelice di Fitalia", "PA", "San Giuseppe", fx(8, 23)),
  pat("Campofelice di Roccella", "PA", "Santa Rosalia", fx(9, 4)),
  pat("Campofiorito", "PA", "Santo Stefano", fx(12, 26)),
  pat("Camporeale", "PA", "Sant'Antonio di Padova", fx(6, 13)),
  pat("Capaci", "PA", "Sant'Erasmo", fx(6, 2)),
  pat("Carini", "PA", "SS. Crocifisso", fx(9, 12), { days: 3, name: "Festa del SS. Crocifisso · Patrono di Carini", icon: "✝️", description: "Festa patronale di Carini in onore del Santissimo Crocifisso: tre giorni di processioni, luminarie e fuochi d'artificio.", curiosity: "Carini è celebre per il suo castello e la leggenda della 'Baronessa di Carini'." }),
  pat("Castelbuono", "PA", "Sant'Anna", fx(7, 26), { description: "Festa patronale di Castelbuono, in onore di Sant'Anna, con processione fino al Castello dei Ventimiglia.", curiosity: "Castelbuono è la patria della 'manna' e del dolce testa di turco." }),
  pat("Casteldaccia", "PA", "San Giuseppe", fx(3, 19)),
  pat("Castellana Sicula", "PA", "San Francesco di Paola", wd(7, 8, 4), { days: 4, when: "Metà luglio", approx: true, note: VERIFY }),
  pat("Castronovo di Sicilia", "PA", "San Vitale", fx(3, 9)),
  pat("Cefalà Diana", "PA", "San Francesco di Paola", fx(8, 17)),
  pat("Cefalù", "PA", "SS. Salvatore", fx(8, 6), { name: "Festa del SS. Salvatore (Trasfigurazione)", description: "Festa patronale di Cefalù con la tradizionale 'ntinna a mare, l'albero della cuccagna sul molo.", curiosity: "I concorrenti sfidano un palo insaponato proteso sul mare per afferrare la bandierina." }),
  pat("Cerda", "PA", "Maria SS. Addolorata", fx(8, 16)),
  pat("Chiusa Sclafani", "PA", "San Nicola", fx(12, 6)),
  pat("Ciminna", "PA", "San Vito", wd(9, 1, 0), { when: "Prima domenica di settembre" }),
  pat("Cinisi", "PA", "Santa Fara", wd(7, 1, 0), { when: "Prima domenica di luglio" }),
  pat("Collesano", "PA", "Madonna dei Miracoli", fx(5, 26)),
  pat("Contessa Entellina", "PA", "San Nicola di Mira", fx(12, 6), { curiosity: "Comune arbëreshë: le celebrazioni seguono il rito bizantino-greco." }),
  pat("Corleone", "PA", "San Leoluca", fx(3, 1), { description: "Festa patronale in onore di San Leoluca, monaco basiliano protettore di Corleone.", curiosity: "Le reliquie del santo sono custodite nella Chiesa Madre del paese." }),
  pat("Ficarazzi", "PA", "SS. Crocifisso delle Grazie", fx(9, 14), { name: "Festa del SS. Crocifisso delle Grazie" }),
  pat("Gangi", "PA", "San Cataldo", ea(50), { when: "Lunedì di Pentecoste", description: "Festa patronale nel borgo medievale di Gangi, tra i più belli d'Italia.", curiosity: "Gangi è arroccata sul Monte Marone, con vista sull'Etna nelle giornate limpide." }),
  pat("Geraci Siculo", "PA", "San Bartolomeo", fx(8, 24)),
  pat("Giardinello", "PA", "SS. Crocifisso", fx(8, 10), { name: "Festa del SS. Crocifisso" }),
  pat("Giuliana", "PA", "Madonna dell'Udienza e Santa Giuliana", fx(9, 3)),
  pat("Godrano", "PA", "San Giuseppe", fx(9, 3)),
  pat("Gratteri", "PA", "San Giacomo Apostolo", fx(9, 7), { days: 3, curiosity: "La ricorrenza liturgica è il 25 luglio, ma la festa grande si fa a settembre." }),
  pat("Isnello", "PA", "San Nicola di Bari", fx(12, 6)),
  pat("Isola delle Femmine", "PA", "Madonna delle Grazie", fx(7, 2)),
  pat("Lascari", "PA", "SS. Crocifisso", wd(7, 1, 0), { name: "Festa del SS. Crocifisso", when: "Prima domenica di luglio" }),
  pat("Lercara Friddi", "PA", "Maria SS. di Costantinopoli", fx(8, 19), { days: 3 }),
  pat("Marineo", "PA", "San Ciro", fx(1, 31), { curiosity: "San Ciro si festeggia anche la terza domenica di agosto." }),
  pat("Marineo", "PA", "San Ciro (festa estiva)", wd(8, 15, 0), { when: "Terza domenica di agosto", description: "Festa estiva del patrono San Ciro, medico e martire, con processione e fiera." }),
  pat("Mezzojuso", "PA", "San Nicolò di Mira", fx(12, 6), { curiosity: "Mezzojuso ha due patroni: San Nicolò per il rito greco e la Madonna dei Miracoli per il rito latino." }),
  pat("Mezzojuso", "PA", "Madonna dei Miracoli", fx(9, 8)),
  pat("Misilmeri", "PA", "San Giusto", last(8, 0), { when: "Ultima domenica di agosto", description: "Festa patronale di Misilmeri in onore di San Giusto martire.", curiosity: "Misilmeri fu teatro della storica battaglia risorgimentale di Gorgo Lungo." }),
  pat("Monreale", "PA", "San Castrense", fx(2, 11), { description: "Festa del patrono San Castrense, vescovo, nella città del Duomo arabo-normanno." }),
  pat("Monreale", "PA", "SS. Crocifisso", fx(5, 3), { name: "Festa del SS. Crocifisso", description: "Grande festa del Santissimo Crocifisso di Monreale, con processione e celebrazioni solenni.", curiosity: "Nel 2026 la festa ha celebrato il suo 400° anniversario (1626–2026)." }),
  pat("Montelepre", "PA", "SS. Crocifisso", last(6, 0), { name: "Festa del SS. Crocifisso", when: "Ultima domenica di giugno" }),
  pat("Montemaggiore Belsito", "PA", "SS. Crocifisso", fx(9, 14), { name: "Festa del SS. Crocifisso", curiosity: "Il Crocifisso si festeggia anche il 3 maggio; a settembre c'è la festa grande con la fiera." }),
  pat("Palazzo Adriano", "PA", "San Nicola di Mira", fx(12, 6), { curiosity: "Paese arbëreshë, set del film 'Nuovo Cinema Paradiso'." }),
  { id: "festino-santa-rosalia", name: "Festino di Santa Rosalia", place: "Palermo", province: "PA", rule: fx(7, 14), days: 2, category: "religiosa", icon: "👑", description: "Il carro trionfale della 'Santuzza' sfila dal Palazzo Reale al Foro Italico, chiudendo con i fuochi sul mare.", curiosity: "Al culmine risuona il grido 'Viva Palermo e Santa Rosalia!'." },
  { id: "acchianata-santa-rosalia", name: "Acchianata a Monte Pellegrino", place: "Palermo", province: "PA", rule: fx(9, 3), days: 2, category: "religiosa", icon: "🕯️", description: "Migliaia di fedeli salgono di notte al Santuario di Santa Rosalia sul Monte Pellegrino.", curiosity: "È il pellegrinaggio più sentito dell'anno, complementare al Festino di luglio." },
  { id: "santa-lucia-palermo", name: "Festa di Santa Lucia", place: "Palermo", province: "PA", rule: fx(12, 13), category: "religiosa", icon: "🕯️", description: "Il 13 dicembre i palermitani rinunciano a pane e pasta e mangiano cuccìa, arancine e panelle.", curiosity: "La cuccìa, grano bollito con ricotta o crema, è il dolce simbolo della giornata." },
  pat("Partinico", "PA", "San Leonardo", fx(11, 6), { description: "Festa patronale di Partinico in onore di San Leonardo abate.", curiosity: "Partinico sorge nella fertile piana tra Palermo e il golfo di Castellammare." }),
  pat("Petralia Soprana", "PA", "SS. Pietro e Paolo", fx(6, 29), { name: "Festa dei SS. Pietro e Paolo", description: "Festa patronale nel borgo più alto delle Madonie.", curiosity: "Petralia Soprana è tra 'I Borghi più belli d'Italia'." }),
  pat("Petralia Sottana", "PA", "San Calogero", fx(6, 18), { description: "Festa patronale sulle Madonie in onore di San Calogero eremita.", curiosity: "Petralia Sottana è porta d'accesso al Parco delle Madonie." }),
  pat("Petralia Sottana", "PA", "Maria SS. dell'Alto", fx(8, 15), { description: "Festa della compatrona Maria SS. dell'Alto, nel giorno dell'Assunta." }),
  pat("Piana degli Albanesi", "PA", "San Giorgio Megalomartire", fx(4, 23)),
  pat("Piana degli Albanesi", "PA", "Maria SS. Odigitria", fx(9, 2), { curiosity: "È la principale festa della comunità arbëreshë di Piana." }),
  pat("Piana degli Albanesi", "PA", "San Demetrio Megalomartire", fx(10, 26)),
  pat("Polizzi Generosa", "PA", "San Gandolfo", wd(9, 15, 0), { when: "Terza domenica di settembre" }),
  pat("Pollina", "PA", "San Giuliano", wd(7, 8, 0), { when: "Seconda domenica di luglio" }),
  pat("Prizzi", "PA", "San Giorgio martire", fx(4, 23)),
  pat("Roccamena", "PA", "San Giuseppe", fx(3, 19)),
  pat("Roccapalumba", "PA", "SS. Crocifisso", fx(8, 13), { name: "Festa del SS. Crocifisso" }),
  pat("San Cipirello", "PA", "Maria SS. Immacolata", fx(9, 8)),
  pat("San Giuseppe Jato", "PA", "Maria SS. della Provvidenza", fx(8, 13), { days: 4 }),
  pat("San Mauro Castelverde", "PA", "San Mauro", wd(7, 1, 2), { when: "Primo martedì di luglio" }),
  pat("Santa Cristina Gela", "PA", "Santa Cristina", fx(7, 24), { curiosity: "Il più piccolo dei comuni arbëreshë della provincia." }),
  pat("Santa Flavia", "PA", "Sant'Anna", fx(7, 26), { curiosity: "Nel territorio comunale si trovano Solunto e il borgo marinaro di Porticello." }),
  pat("Sciara", "PA", "SS. Crocifisso", wd(8, 8, 0), { name: "Festa del SS. Crocifisso", when: "Seconda domenica di agosto" }),
  pat("Scillato", "PA", "Maria SS. della Catena", fx(8, 20)),
  pat("Sclafani Bagni", "PA", "SS. Ecce Homo", last(6, 0), { name: "Festa del SS. Ecce Homo", when: "Ultima domenica di giugno" }),
  pat("Termini Imerese", "PA", "Beato Agostino Novello", fx(5, 19), { curiosity: "Termini è città termale di origine greco-romana, ricca di storia e archeologia." }),
  pat("Terrasini", "PA", "Maria SS. delle Grazie", fx(9, 8), { name: "Madonna delle Grazie", description: "Festa patronale di Terrasini in onore della Madonna delle Grazie.", curiosity: "Terrasini è nota anche per la festa di 'li Schietti' a Pasqua." }),
  pat("Torretta", "PA", "San Calogero", fx(6, 18)),
  pat("Trabia", "PA", "SS. Crocifisso", last(9, 0), { name: "Festa del SS. Crocifisso", when: "Ultima domenica di settembre" }),
  pat("Trappeto", "PA", "Maria SS. Annunziata", fx(3, 25), { icon: "🏠", name: "Festa di Maria SS. Annunziata · Patrona di Trappeto", description: "La festa patronale del borgo dell'Appartamento Matteo: processione del simulacro per le vie del paese con i tamburinari, preceduta dal triduo.", curiosity: "La preparazione inizia con la novena di San Giuseppe (8–19 marzo)." }),
  { id: "trappeto-assunta", name: "Maria SS. Assunta · Processione a mare", place: "Trappeto", province: "PA", rule: fx(8, 8), days: 9, category: "folklore", icon: "⛵", description: "La festa estiva di Trappeto: la Madonna Assunta viene portata in barca nel Golfo di Castellammare, tra musica, mostre sul lungomare e fuochi finali.", curiosity: "Il giorno clou è Ferragosto: a due passi dall'appartamento!", when: "Clou il 15 agosto" },
  pat("Ustica", "PA", "San Bartolomeo", fx(8, 24), { curiosity: "Ustica è la prima riserva marina istituita in Italia." }),
  pat("Valledolmo", "PA", "Sant'Antonio di Padova", fx(8, 18)),
  pat("Ventimiglia di Sicilia", "PA", "Maria SS. del Rosario", wd(10, 1, 0), { when: "Prima domenica di ottobre" }),
  pat("Vicari", "PA", "San Giorgio martire", fx(5, 23)),
  pat("Vicari", "PA", "Santa Rosalia", fx(9, 24)),
  pat("Villabate", "PA", "San Giuseppe", fx(3, 19)),
  pat("Villafrati", "PA", "San Giuseppe", fx(3, 19)),

  // ————— PALERMO · riti, folklore e sagre —————
  { id: "carnevale-termini", name: "Carnevale Termitano", place: "Termini Imerese", province: "PA", rule: ea(-52), days: 6, category: "folklore", icon: "🎭", description: "Uno dei carnevali più antichi di Sicilia, con carri allegorici e le maschere di 'U Nannu e a Nanna'.", curiosity: "Il Nannu viene bruciato in piazza l'ultimo giorno di Carnevale.", when: "Giovedì grasso – Martedì grasso", approx: true, note: VERIFY },
  { id: "mastro-di-campo-mezzojuso", name: "Il Mastro di Campo", place: "Mezzojuso", province: "PA", rule: ea(-49), category: "folklore", icon: "🎭", description: "Rappresentazione carnevalesca in costume che rievoca l'assalto al castello, tra cavalieri, re e regina.", curiosity: "Tradizione di origine seicentesca, tra le più originali del carnevale siciliano.", when: "Ultima domenica di Carnevale", approx: true, note: VERIFY },
  { id: "pasqua-piana-albanesi", name: "Pasqua Bizantina", place: "Piana degli Albanesi", province: "PA", rule: ea(0), category: "religiosa", icon: "🕊️", description: "Riti pasquali in lingua greca e albanese: la comunità sfila nei preziosi costumi tradizionali ricamati in oro.", curiosity: "Al termine della liturgia si distribuiscono le uova rosse benedette.", when: "Domenica di Pasqua (rito bizantino)", note: "Se la Pasqua ortodossa cade in un'altra data, il rito segue comunque il calendario cattolico." },
  { id: "ballo-diavoli-prizzi", name: "Ballo dei Diavoli (Abballu di li Diavuli)", place: "Prizzi", province: "PA", rule: ea(0), category: "folklore", icon: "😈", description: "I Diavoli mascherati e la Morte ostacolano l'incontro tra la Madonna e il Cristo risorto, finché gli Angeli li sconfiggono.", curiosity: "Rito arcaico unico in Sicilia, culmina in Piazza Sant'Anna con la vittoria del bene.", when: "Domenica di Pasqua" },
  { id: "schietti-terrasini", name: "Festa di li Schietti", place: "Terrasini", province: "PA", rule: ea(0), category: "folklore", icon: "🍊", description: "I giovani celibi ('schietti') sollevano con una mano un pesante albero di arancio addobbato, per dimostrare forza alla promessa sposa.", curiosity: "Tradizione pasquale che risale a una festa contadina di fertilità.", when: "Pasqua", approx: true, note: VERIFY },
  { id: "sagra-carciofo-cerda", name: "Sagra del Carciofo · Cynara Festival", place: "Cerda", province: "PA", rule: fx(4, 23), days: 4, category: "sagra", icon: "🌿", description: "Quattro giorni dedicati al carciofo di Cerda con degustazioni, cortei storici e stand gastronomici.", curiosity: "A Cerda sorge il monumento al carciofo: il paese ne è la capitale in Sicilia.", when: "Intorno al 25 aprile", approx: true, note: VERIFY },
  { id: "sagra-ciliegie-chiusa", name: "Sagra delle Ciliegie", place: "Chiusa Sclafani", province: "PA", rule: wd(6, 8, 0), category: "sagra", icon: "🍒", description: "Festa della ciliegia 'cappuccia' con mercato, degustazioni e cortei folkloristici.", curiosity: "È una delle sagre più longeve della provincia (oltre 50 edizioni).", when: "Seconda domenica di giugno", approx: true, note: VERIFY },
  { id: "sagra-spiga-gangi", name: "Sagra della Spiga", place: "Gangi", province: "PA", rule: fx(8, 1), days: 9, category: "sagra", icon: "🌾", description: "Celebra il ciclo del grano con il corteo di Demetra, gruppi folk e prodotti tipici delle Madonie.", curiosity: "Tra le sagre più antiche di Sicilia: nel 2026 la 61ª edizione.", when: "Prima metà di agosto", approx: true, note: VERIFY },
  { id: "sagra-nocciole-polizzi", name: "Sagra delle Nocciole", place: "Polizzi Generosa", province: "PA", rule: fx(8, 20), days: 4, category: "sagra", icon: "🌰", description: "Degustazioni di nocciole delle Madonie, dolci tipici, musica e spettacoli nel borgo.", curiosity: "Polizzi è anche patria dello 'sfoglio', dolce di tuma e cioccolato.", when: "Fine agosto", approx: true, note: VERIFY },
  { id: "funghi-fest-castelbuono", name: "Funghi Fest", place: "Castelbuono", province: "PA", rule: wd(10, 22, 5), days: 3, category: "sagra", icon: "🍄", description: "Festa dei funghi delle Madonie con mercati, show cooking e prodotti tipici.", curiosity: "In contemporanea a Petralia Sottana si tiene la Festa dei Sapori Madoniti d'Autunno.", when: "Fine ottobre", approx: true, note: VERIFY },

  // ————— Provincia di TRAPANI · Patroni di tutti i 25 comuni —————
  pat("Alcamo", "TP", "Madonna dei Miracoli", fx(6, 19), { days: 3, name: "Festa della Madonna dei Miracoli", description: "Festa patronale di Alcamo in onore della Madonna dei Miracoli.", curiosity: "Il giorno principale è il 21 giugno." }),
  pat("Buseto Palizzolo", "TP", "Madonna del Carmelo", fx(7, 16)),
  pat("Calatafimi-Segesta", "TP", "SS. Crocifisso", fx(5, 3), { name: "Festa del SS. Crocifisso", icon: "✝️", description: "Solenne festa del Santissimo Crocifisso, tra le più sentite del trapanese.", note: "La grande festa storica con i 'Ceti' (corporazioni di mestiere) non è annuale: viene indetta a distanza di diversi anni (l'edizione 2026 è arrivata dopo 14 anni) e annunciata il giorno di Pasqua.", curiosity: "Sfilano Maestranza, Borgesi, Cavallari, Massari, Mugnai, Ortolani e gli altri ceti con i loro carri." }),
  pat("Calatafimi-Segesta", "TP", "Maria SS. di Giubino", wd(9, 22, 0), { when: "Quarta domenica di settembre" }),
  pat("Campobello di Mazara", "TP", "San Vito martire", fx(6, 15)),
  pat("Castellammare del Golfo", "TP", "Maria SS. del Soccorso", fx(8, 19), { days: 3, category: "folklore", name: "Madonna del Soccorso · Rievocazione", description: "Festa patronale con rievocazione storica dello sbarco e processione a mare.", curiosity: "Il porticciolo si illumina di barche in processione sotto il castello." }),
  pat("Castelvetrano", "TP", "San Giovanni Battista", fx(6, 24), { curiosity: "Nel territorio comunale c'è il Parco archeologico di Selinunte." }),
  { id: "custonaci-madonna", name: "Madonna di Custonaci", place: "Custonaci / Erice", province: "TP", rule: last(8, 3), category: "religiosa", icon: "⛪", description: "Festa della patrona di Custonaci ed Erice, Maria SS. di Custonaci.", curiosity: "Nelle 'Peregrinatio' straordinarie il quadro della Madonna viene portato da Custonaci fino a Erice.", when: "Ultimo mercoledì di agosto" },
  pat("Favignana", "TP", "SS. Crocifisso", fx(9, 14), { name: "Festa del SS. Crocifisso", icon: "✝️", description: "Festa patronale dell'isola di Favignana in onore del Santissimo Crocifisso.", curiosity: "Favignana è la maggiore delle Egadi, terra dell'antica tonnara Florio." }),
  pat("Gibellina", "TP", "San Rocco", fx(8, 16), { curiosity: "La nuova Gibellina è un museo a cielo aperto; i ruderi della vecchia sono coperti dal Cretto di Burri." }),
  pat("Marsala", "TP", "Maria SS. della Cava", fx(1, 19), { description: "Festa della patrona principale di Marsala, Maria SS. della Cava, il cui simulacro fu ritrovato in una grotta nel 1518." }),
  pat("Marsala", "TP", "San Giovanni Battista", fx(6, 24), { description: "Festa del compatrono di Marsala, San Giovanni Battista.", curiosity: "Legata alla Grotta della Sibilla presso la chiesa di San Giovanni al Boeo." }),
  pat("Mazara del Vallo", "TP", "San Vito", fx(6, 15), { description: "Ricorrenza liturgica del patrono San Vito; il grande Festino si tiene ad agosto." }),
  { id: "mazara-festino-san-vito", name: "Festino di San Vito", place: "Mazara del Vallo", province: "TP", rule: wd(8, 22, 0), off: -7, days: 8, category: "religiosa", icon: "⛪", description: "Settimana di festeggiamenti per il patrono San Vito con cortei storici, la sfilata del carro e la processione a mare.", curiosity: "La ricorrenza liturgica cade il 15 giugno, ma il grande festino è ad agosto.", when: "Seconda metà di agosto", approx: true, note: VERIFY },
  pat("Misiliscemi", "TP", "San Giuseppe", fx(3, 19), { curiosity: "È il comune più giovane della Sicilia, nato nel 2021 dalle frazioni a sud di Trapani." }),
  pat("Paceco", "TP", "Santa Caterina d'Alessandria", fx(11, 25)),
  pat("Pantelleria", "TP", "San Fortunato", fx(10, 16), { description: "Festa patronale dell'isola di Pantelleria in onore di San Fortunato martire.", curiosity: "Pantelleria è la 'perla nera' del Mediterraneo, terra di Zibibbo e capperi." }),
  pat("Partanna", "TP", "San Vito", fx(6, 15)),
  pat("Petrosino", "TP", "Maria SS. delle Grazie", fx(5, 31)),
  pat("Poggioreale", "TP", "Sant'Antonio di Padova", fx(6, 13)),
  pat("Salaparuta", "TP", "San Giuseppe", fx(3, 19)),
  pat("Salemi", "TP", "San Nicola di Bari", fx(12, 6)),
  { id: "san-giuseppe-salemi", name: "Festa di San Giuseppe · Pani e Cene", place: "Salemi", province: "TP", rule: fx(3, 19), category: "religiosa", icon: "🍞", description: "Cene e altari votivi ricoperti di pani artistici modellati a mano in onore di San Giuseppe.", curiosity: "A Salemi i pani di San Giuseppe sono vere opere d'arte in pasta cotta al forno." },
  pat("San Vito Lo Capo", "TP", "San Vito Martire", fx(6, 15), { description: "Festa patronale in onore di San Vito, con processione e festeggiamenti nel borgo.", curiosity: "Il paese e il suo santuario-fortezza devono a San Vito il nome e la storia millenaria." }),
  pat("Santa Ninfa", "TP", "Santa Ninfa", fx(11, 12)),
  pat("Trapani", "TP", "Sant'Alberto", fx(8, 7), { name: "Festa di Sant'Alberto", description: "Festa patronale di Trapani in onore di Sant'Alberto degli Abati.", curiosity: "Si distribuisce l'acqua benedetta di Sant'Alberto, ritenuta miracolosa." }),
  { id: "trapani-madonna", name: "Festa della Madonna di Trapani", place: "Trapani", province: "TP", rule: fx(8, 16), category: "religiosa", icon: "⛪", description: "Solenne festa mariana della compatrona con processione della venerata effigie della Madonna di Trapani.", curiosity: "La statua marmorea è attribuita a Nino Pisano, nel Santuario dell'Annunziata." },
  pat("Valderice", "TP", "Cristo Re", wd(11, 20, 0), { name: "Festa di Cristo Re", when: "Domenica di Cristo Re (ultima prima dell'Avvento)" }),
  pat("Vita", "TP", "San Vito", fx(6, 15)),

  // ————— TRAPANI · riti, folklore e sagre —————
  { id: "misteri-marsala", name: "Processione del Giovedì Santo", place: "Marsala", province: "TP", rule: ea(-3), category: "religiosa", icon: "✝️", description: "Sacra rappresentazione vivente della Passione: centinaia di figuranti in costume sfilano per il centro.", curiosity: "A differenza di Trapani, a Marsala i Misteri sono interpretati da persone vere.", when: "Giovedì Santo" },
  { id: "misteri-trapani", name: "Processione dei Misteri", place: "Trapani", province: "TP", rule: ea(-2), days: 2, category: "religiosa", icon: "✝️", description: "I venti Sacri Gruppi scolpiti sfilano per la città in una processione che dura quasi 24 ore.", curiosity: "I gruppi sono portati a spalla con l'antica 'annacata', il tipico dondolio a ritmo delle marce.", when: "Venerdì Santo – Sabato Santo" },
  { id: "federicina-erice", name: "FedEricina · Rievocazione storica", place: "Erice", province: "TP", rule: wd(9, 15, 5), days: 3, category: "folklore", icon: "🏰", description: "Cortei in costume, giullari e rievocazioni medievali tra le vie in pietra di Erice.", when: "Metà settembre", approx: true, note: VERIFY },
  { id: "cous-cous-fest", name: "Cous Cous Fest", place: "San Vito Lo Capo", province: "TP", rule: last(9, 0), off: -9, days: 10, category: "sagra", icon: "🍲", description: "Festival internazionale del cous cous, simbolo d'integrazione mediterranea: gare tra chef, degustazioni e concerti.", curiosity: "Il cous cous alla trapanese, di pesce, è l'anima della manifestazione.", when: "Seconda metà di settembre", approx: true, note: VERIFY },
  { id: "sagra-pane-nero-castelvetrano", name: "Sagra del Pane Nero", place: "Castelvetrano", province: "TP", rule: wd(10, 15, 6), days: 2, category: "sagra", icon: "🍞", description: "Festa del pane nero di Castelvetrano, Presidio Slow Food a base di grano duro tumminia.", curiosity: "Il pane nero si cuoce nel forno a legna con la crosta cosparsa di sesamo.", when: "Metà ottobre", approx: true, note: VERIFY },
  { id: "sagra-muffuletta-poggioreale", name: "Sagra della Muffuletta", place: "Poggioreale", province: "TP", rule: wd(11, 1, 6), days: 2, category: "sagra", icon: "🥯", description: "Festa del tipico pane morbido condito con olio, formaggio e acciughe.", when: "Inizio novembre", approx: true, note: VERIFY },
  { id: "sagra-olio-campobello", name: "Sagra dell'Olio e dell'Oliva", place: "Campobello di Mazara", province: "TP", rule: wd(11, 8, 6), days: 2, category: "sagra", icon: "🫒", description: "Festa dell'olio novello e dell'oliva Nocellara del Belice, con degustazioni e frantoi aperti.", curiosity: "La Nocellara del Belice è un'oliva DOP, sia da tavola sia da olio.", when: "Metà novembre", approx: true, note: VERIFY },
  { id: "sagra-salsiccia-santa-ninfa", name: "Sagra della Salsiccia · Un giorno da pecora", place: "Santa Ninfa", province: "TP", rule: wd(11, 15, 6), days: 2, category: "sagra", icon: "🌭", description: "Salsiccia alla brace, ricotta e prodotti della pastorizia del Belice.", when: "Seconda metà di novembre", approx: true, note: VERIFY },
  { id: "presepe-vivente-custonaci", name: "Presepe Vivente di Custonaci", place: "Custonaci (Grotta Mangiapane)", province: "TP", rule: fx(12, 25), days: 13, category: "folklore", icon: "🌟", description: "Nel borgo rupestre della Grotta Mangiapane rivive un villaggio con oltre 160 figuranti e gli antichi mestieri.", curiosity: "La scenografia è una grotta abitata fin dal Paleolitico.", when: "Periodo natalizio (Natale – Epifania)", approx: true, note: "Aperto solo in alcune giornate del periodo natalizio: verifica il calendario ufficiale." },
];

// ————— Calcolo date —————
function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const iso = (d: Date) => d.toISOString().slice(0, 10);

function ruleDate(r: Rule, y: number): Date {
  switch (r.k) {
    case "fixed": return new Date(Date.UTC(y, r.m - 1, r.d));
    case "easter": return addDays(easter(y), r.off);
    case "wd": {
      const base = new Date(Date.UTC(y, r.m - 1, r.d));
      return addDays(base, (r.wd - base.getUTCDay() + 7) % 7);
    }
    case "last": {
      const end = new Date(Date.UTC(y, r.m, 0));
      return addDays(end, -((end.getUTCDay() - r.wd + 7) % 7));
    }
  }
}

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
function rangeLabel(s: Date, e: Date): string {
  const [sd, sm, sy] = [s.getUTCDate(), s.getUTCMonth(), s.getUTCFullYear()];
  const [ed, em, ey] = [e.getUTCDate(), e.getUTCMonth(), e.getUTCFullYear()];
  if (s.getTime() === e.getTime()) return `${sd} ${MONTHS[sm]} ${sy}`;
  if (sy !== ey) return `${sd} ${MONTHS[sm]} ${sy} – ${ed} ${MONTHS[em]} ${ey}`;
  if (sm !== em) return `${sd} ${MONTHS[sm]} – ${ed} ${MONTHS[em]} ${sy}`;
  return `${sd}–${ed} ${MONTHS[sm]} ${sy}`;
}

const DEFAULT_ICON: Record<Category, string> = { religiosa: "⛪", sagra: "🍽️", folklore: "🎭", nazionale: "🇮🇹" };

export function festivalsForYear(y: number): Festival[] {
  return DEFS.map(({ rule, days = 1, off = 0, when, icon, ...rest }) => {
    const s = addDays(ruleDate(rule, y), off);
    const e = addDays(s, days - 1);
    const range = rangeLabel(s, e);
    return {
      ...rest,
      id: `${rest.id}-${y}`,
      icon: icon ?? DEFAULT_ICON[rest.category],
      start: iso(s),
      end: iso(e),
      dateLabel: `${when ? `${when} · ` : ""}${range}${rest.approx ? " (indicativo)" : ""}`,
    };
  });
}

// Numero di ricorrenze distinte in archivio (per anno).
export const FESTIVAL_COUNT = DEFS.length;

// Tutte le ricorrenze dei prossimi 12 mesi a partire da 'from', ordinate per data.
export function upcomingFestivals(from: Date = new Date()): Festival[] {
  const fromIso = iso(from);
  const toIso = iso(addDays(from, 365));
  const y = from.getUTCFullYear();
  return [...festivalsForYear(y), ...festivalsForYear(y + 1)]
    .filter((f) => f.end >= fromIso && f.start < toIso)
    .sort((a, b) => a.start.localeCompare(b.start));
}

// Date ISO da marcare sul calendario (anno precedente, corrente e due successivi).
export function festivalDateSet(from: Date = new Date()): Record<string, Festival[]> {
  const map: Record<string, Festival[]> = {};
  const y = from.getUTCFullYear();
  for (let yy = y - 1; yy <= y + 2; yy++) {
    for (const f of festivalsForYear(yy)) {
      let cur = new Date(f.start + "T00:00:00Z");
      const end = new Date(f.end + "T00:00:00Z");
      while (cur <= end) {
        const k = iso(cur);
        (map[k] ??= []).push(f);
        cur = addDays(cur, 1);
      }
    }
  }
  return map;
}
