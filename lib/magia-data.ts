export const MAGIA_FOKOZATOK = [
  {
    id: 1,
    cim: "Első Fokozat",
    rovidcim: "I. Fokozat",
    icon: "🌱",
    szin: "#4ade80",
    szellem: {
      cim: "Mágikus Szellemiskolázás (I.) — Gondolatellenőrzés, -fegyelmezés, -uralás",
      leiras: `Az első lépés: ülj kényelmesen vagy feküdj le, lazítsd el tested, csukd be szemed, és 5 percen át figyeld gondolataid menetét passzív megfigyelőként. Minden nap hosszabbítsd meg 1 perccel, míg 10 percig fenntartható. Ez reggel és este végzendő. A cél: teljes gondolatüresség 10 percig.`,
      gyakorlatok: [
        { key: "gondolatellenorzes", cim: "Gondolatellenőrzés", leiras: "Naponta kétszer 5–10 percig: passzív megfigyelőként figyeld gondolataid menetét anélkül, hogy ítélkeznél felettük." },
        { key: "gondolatfegyelmezés", cim: "Gondolatfegyelmezés", leiras: "Bizonyos gondolatok tudatos elhárítása; egy saját maga által választott gondolat megtartása; gondolatüresség képzése." },
        { key: "gondolaturales", cim: "Gondolaturalás + Mágikus Napló", leiras: "Mágikus napló készítése: minden sikerről, kudarcról, a gyakorlatok időtartamáról vezess naplót. Önkritika, tervkészítés a következő napra/hétre." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (I.) — Introspekció vagy Önmegismerés",
      leiras: `Az önmegismerés minden beavatói módszer feltétele. Jegyezd naplódba lelked valamennyi rossz oldalát; hibáidat, szokásaidat, szenvedélyeidet. Legyél magadhoz szigorú. Rendelje minden hibáját a négy elem (Tűz, Víz, Levegő, Föld) valamelyikéhez, három erősségi fokozatban.`,
      gyakorlatok: [
        { key: "introspekcio", cim: "Introspekció — Önmegismerés", leiras: "Pár percet reggel és este önkritikának szentelj: fedezd fel lelked hibáit, szokásaidat, gyengeségeidet. Jegyezd le őket." },
        { key: "fekete_tukor", cim: "Fekete Lelki Tükör (hibák)", leiras: "Hibáidat rendeld a négy elemhez, három erősségi fokozatban. TŰZ: indulatosság, féltékenység, harag. LEVEGŐ: könnyelműség, kérkedés, fecsegés. VÍZ: közömbösség, hanyagság, akaratosság. FÖLD: sértődöttség, lustaság, nehézkesség." },
        { key: "feher_tukor", cim: "Fehér Lelki Tükör (erények)", leiras: "Jó tulajdonságaidat is rendeld elemekhez. TŰZ: ténykedés, lelkesedés, bátorság. LEVEGŐ: szorgalom, öröm, jószívűség. VÍZ: szerénység, nyugalom, gyöngédség. FÖLD: kitartás, pontosság, felelősségérzet." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (I.) — Az Anyagi Test, Légzés, Étkezés, Víz",
      leiras: `Test, lélek és szellem egyidőben iskolázandók. Reggeli testápolás, reggeli torna, tudatos légzés, tudatos étkezés, a víz mágiája.`,
      gyakorlatok: [
        { key: "reggeli_testapolas", cim: "Reggeli Testápolás", leiras: "Reggel kefélj le minden tested egy puha kefével (a bőr enyhén piruljon). Utána mosd le hideg vízzel és dörgöld szárazra. Életen át tartó napi szokás." },
        { key: "reggeli_torna", cim: "Reggeli Torna", leiras: "Naponta néhány perc reggeli torna; cél: hajlékony, rugalmas test." },
        { key: "tudatos_legzes", cim: "Tudatos Légzés", leiras: "Légzés közben képzeld el intenzíven, hogy egészség, nyugalom, siker áramlik be tested minden porcikájába. Reggel és este 7–7 lélegzettel kezd, naponta 1-gyel növeld. Soha ne lépd túl a fél órát." },
        { key: "tudatos_etkezes", cim: "Tudatos Étkezés (az Eucharisztia titka)", leiras: "Étel/ital fölé összpontosítsd kívánságodat, mintha már teljesült volna. Lassan, tudatosan egyél; ne olvass, ne szórakozz közben. Mindig ugyanazt a kívánságot alkalmazzuk légzésnél és evésnél." },
        { key: "viz_magiaja", cim: "A Víz Mágiája", leiras: "Minden kézmosáskor képzeld el, hogy a fizikai piszokkal együtt lelki terheidet, kudarcaidat, nyugtalanságodat is lemossák. A szennyezett vizet azonnal öntsd ki. Fordítva: kívánsággal telítheted a fürdővizet, hogy az erő átmenjen testedbe." }
      ]
    },
    idotartam: "2 hét – 1 hónap",
    osszefoglalo: "Gondolatellenőrzés és -uralás, lelki tükör elkészítése (fekete és fehér), a test napi ápolása és a tudatos légzés + étkezés + víz mágiájának elsajátítása."
  },
  {
    id: 2,
    cim: "Második Fokozat",
    rovidcim: "II. Fokozat",
    icon: "🌿",
    szin: "#34d399",
    szellem: {
      cim: "Mágikus Szellemiskolázás (II.) — Autoszuggesztió és Koncentrációs Gyakorlatok",
      leiras: "A tudatalatti tudat titkának megismerése és az autoszuggesztió elsajátítása. Koncentrációs gyakorlatok öt érzékre.",
      gyakorlatok: [
        { key: "autoszuggesztio", cim: "Autoszuggesztió — a Tudatalatti Titka", leiras: "Az elalvás előtti pillanatban (a tudatalatti kapuja nyitva) a legerősebb kívánságodat, legszebb gondolataidat őrizd meg, és ezeket vidd át az álomba." },
        { key: "konc_keppel", cim: "Koncentráció képpel", leiras: "Képzelj el egy tárgyat, személyt vagy tájat a lehető legrészletesebben. Tartsd 10 percig." },
        { key: "konc_hanggal", cim: "Koncentráció hanggal", leiras: "Idézz fel egy hangot, zenét, szót belső hallással. Tartsd fenn külső figyelemelterelés nélkül." },
        { key: "konc_erzekkel", cim: "Koncentráció érzéssel (tapintás/hőmérséklet)", leiras: "Képzeld el egy tárgy vagy anyag érintésének pontos érzetét. Pl. fa, fém, víz melege/hidegsége." },
        { key: "konc_illattal", cim: "Koncentráció illattal", leiras: "Idézz fel egy illat pontos érzetét belső szaglással (virág, fű, kenyér, stb.)." },
        { key: "konc_izzal", cim: "Koncentráció ízzel", leiras: "Idézz fel egy íz pontos érzetét belső ízérzékkel (édes, savanyú, sós, keserű)." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (II.) — Asztrál-mágikus Egyensúly és Jellemnemesítés",
      leiras: "Az elemek egyensúlyának helyreállítása: hibák leküzdése, önszuggesztió, transzmutáció.",
      gyakorlatok: [
        { key: "jellemnemesites_lekuzdes", cim: "Jellemnemesítés — Leküzdés/Uralás", leiras: "Az első fokozat fekete tükréből válaszd ki a legerősebb hibáidat. Minden nap munkálkodj ezek visszaszorításán erős akarattal." },
        { key: "jellemnemesites_szuggesztio", cim: "Jellemnemesítés — Önszuggesztió", leiras: "A hiba ellentétes erényes tulajdonságát szuggeráld be magadba elalvás előtt és ébredés után." },
        { key: "jellemnemesites_transmutacio", cim: "Jellemnemesítés — Transzmutáció", leiras: "Alakítsd át a hibát az ellentétes tulajdonságba: pl. indulatosságból energiává, sértődöttségből megértéssé." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (II.) — Tudatos Póruslégzés, Testtartás",
      leiras: "A bőrön keresztüli tudatos légzés és a test uralmának napi szinten való fejlesztése.",
      gyakorlatok: [
        { key: "poruszlegzes", cim: "Tudatos Póruslégzés", leiras: "Képzeld el, hogy nemcsak tüdőddel, hanem egész bőrfelületeddel lélegzel be életenergiát a kozmoszból. Testeden belül érzed, hogyan oszlik szét ez az energia." },
        { key: "tudatos_testtartas", cim: "Tudatos Testtartás", leiras: "Minden napban figyelj testállapotodra; ülj, állj, járj fegyelmezetten, egyenesen." },
        { key: "test_uralasa", cim: "A Test Uralása a Mindennapi Életben", leiras: "Fejleszd a képességet, hogy testest tetszés szerint irányítsd; fáradtságot, hidegérzetet, izommozgásokat tudatosan befolyásolj." }
      ]
    },
    idotartam: "2 hét – 1 hónap",
    osszefoglalo: "Autoszuggesztió, öt érzékre vonatkozó koncentrációs gyakorlatok, jellemnemesítés (leküzdés, önszuggesztió, transzmutáció), tudatos póruslégzés és testtartás."
  },
  {
    id: 3,
    cim: "Harmadik Fokozat",
    rovidcim: "III. Fokozat",
    icon: "🔥",
    szin: "#fb923c",
    szellem: {
      cim: "Mágikus Szellemiskolázás (III.) — Gondolatkoncentráció kettős és hármas érzékkel",
      leiras: "Koncentráció egyidőben két-három érzékkel, majd tárgyakra, tájakra, állatokra és személyekre.",
      gyakorlatok: [
        { key: "konc_2_erzek", cim: "Koncentráció 2–3 érzékkel egyszerre", leiras: "Kombináld pl. a látás és hallás, vagy látás+hallás+tapintás képzeletbeli élményét egyidőben." },
        { key: "konc_targyakra", cim: "Gondolatkoncentráció tárgyakra, tájakra, helyiségekre", leiras: "Idézz fel egy ismert tárgyat, szobát, helyszínt a lehető legrészletesebben minden érzékkel." },
        { key: "konc_allatokra", cim: "Gondolatkoncentráció állatokra és emberekre", leiras: "Idézz fel egy állatot vagy embert teljes valójában; mozgásait, hangjait, lényegét." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (III.) — Elemlégzés az egész testben",
      leiras: "A négy elem tudatos belélegzése az egész testbe, az elem sajátosságával együtt.",
      gyakorlatok: [
        { key: "elemlegzes_tuz", cim: "TŰZ-elemlégzés (meleg)", leiras: "Lélegzés közben képzeld, hogy TŰZ elemet szívsz be; meleg, izzó energia tölti be egész testedet. Testőrző, melegítő, aktivizáló." },
        { key: "elemlegzes_levego", cim: "LEVEGŐ-elemlégzés (könnyű)", leiras: "Lélegzés közben képzeld, hogy LEVEGŐ elemet szívsz be; testet feltölt könnyűség, szabadság érzete." },
        { key: "elemlegzes_viz", cim: "VÍZ-elemlégzés (hideg)", leiras: "Lélegzés közben képzeld, hogy VÍZ elemet szívsz be; hűvös, áramló energia tölti be tested, nyugalmat hoz." },
        { key: "elemlegzes_fold", cim: "FÖLD-elemlégzés (nehéz)", leiras: "Lélegzés közben képzeld, hogy FÖLD elemet szívsz be; nehézség, szilárdság, stabilitás tölt el." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (III.) — Életerő-torlasztás, Térimpregnálás, Biomagnetizmus",
      leiras: "Vitális energia tudatos összegyűjtése a testben, helység feltöltése, magnetizmus.",
      gyakorlatok: [
        { key: "eleterotorlaszolas_test", cim: "Életerő-torlasztás az egész testben", leiras: "Tüdő- és póruslégzéssel halmozz fel életenergiát az egész testben. Érezd annak melegét, sűrűségét." },
        { key: "eleterotorlaszolas_reszek", cim: "Életerő-torlasztás egyes testrészekben", leiras: "Koncentráltan torlasztolj életenergiát pl. a kezedben, fejed, szíved tájékán." },
        { key: "terimpregnalás", cim: "Térimpregnálás (Függelék)", leiras: "Egész helyiséget tölts fel pozitív kívánsággal (egészség, siker, béke) az Akasha-elvhez forduló figyelemmel." },
        { key: "biomagnetizmus", cim: "Biomagnetizmus (Függelék)", leiras: "A kezedből kiáramló mágneses erőt alkalmazd emberek és tárgyak gyógyítására, feltöltésére." }
      ]
    },
    idotartam: "2 hét – 1 hónap",
    osszefoglalo: "Többérzékű gondolatkoncentráció, elemlégzés (Tűz/Víz/Levegő/Föld az egész testben), életerő-torlasztás, térimpregnálás, biomagnetizmus."
  },
  {
    id: 4,
    cim: "Negyedik Fokozat",
    rovidcim: "IV. Fokozat",
    icon: "🌊",
    szin: "#38bdf8",
    szellem: {
      cim: "Mágikus Szellemiskolázás (IV.) — Tudatkihelyezés tárgyakba, állatokba, emberekbe",
      leiras: "A tudat szándékos áthelyezése más lényekbe/tárgyakba belső perspektívához.",
      gyakorlatok: [
        { key: "tudat_targyakba", cim: "Tudatkihelyezés tárgyakba", leiras: "Helyezd tudatodat egy ismert tárgyba (pl. szék, asztal); érzékeld annak struktúráját, súlyát belülről." },
        { key: "tudat_allatokba", cim: "Tudatkihelyezés állatokba", leiras: "Helyezd tudatodat egy állat testébe; érezd annak mozgását, érzékszerveinek működését." },
        { key: "tudat_emberekbe", cim: "Tudatkihelyezés emberekbe", leiras: "Helyezd tudatodat egy ember testébe/elméjébe; ez mély empátia és intuíció fejlesztője." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (IV.) — Elemtorlaszolás és Elemharmónia",
      leiras: "Az elemek torlaszolása az egész testben és a testrégiókban, majd elemharmónia visszaállítása.",
      gyakorlatok: [
        { key: "elemtorlaszolas_test", cim: "Elemtorlaszolás az egész testben", leiras: "Egyetlen elemet torlaszolj be az egész testbe, majd oldódjon fel. Minden elemet külön." },
        { key: "elemtorlaszolas_reszek", cim: "Elemtorlaszolás egyes testrészekben", leiras: "Torlaszolj be egy elemet egy adott testrészbe (pl. TŰZ → fejbe), majd oldd fel. Két módszerrel: tüdőn és póruslégzésen keresztül." },
        { key: "elemharmonia", cim: "Elemharmónia helyreállítása a testrégiókban", leiras: "TŰZ → fej, LEVEGŐ → mell, VÍZ → has, FÖLD → farcsont/lábak. Minden elemnek megvan a saját testterülete." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (IV.) — Rituálék és Gesztusok",
      leiras: "Gesztusok, testtartások és ujjállítások mint rituális eszközök.",
      gyakorlatok: [
        { key: "gesztusok", cim: "Gesztikuláció (Gesztus)", leiras: "Tanulj meg szimbolikus gesztusokat, amelyeket az elemek, az akarat és a szándék megerősítéseként használhatsz." },
        { key: "ritualis_testtartas", cim: "Rituális Testtartás", leiras: "Bizonyos testtartások (pl. ülő, álló, lefekve) hogyan erősíthetik a mágikus munkát." },
        { key: "ujjallitas", cim: "Ujjállítások (Mudra-szerű)", leiras: "Egyes ujjállítások elektromos/mágneses áramlásokat erősítenek, meghatározott elemekkel összefüggésben." }
      ]
    },
    idotartam: "1–2 hónap",
    osszefoglalo: "Tudatkihelyezés tárgyakba/állatokba/emberekbe, elemtorlaszolás és elemharmónia a testrégiókban, rituálék és gesztusok."
  },
  {
    id: 5,
    cim: "Ötödik Fokozat",
    rovidcim: "V. Fokozat",
    icon: "⭐",
    szin: "#facc15",
    szellem: {
      cim: "Mágikus Szellemiskolázás (V.) — Térmágia",
      leiras: "A tudat áthelyezése bármely forma középpontjába, az atomtól a végtelenig. A negyedik dimenzió — tér és idő nélküliség — megtapasztalása.",
      gyakorlatok: [
        { key: "termagia_pont", cim: "Tudat áthelyezése tárgyak középpontjába", leiras: "Válassz egy tárgyat, majd képzeld bele tudatod annak mértani középpontjába. Onnan szemléld az egyensúlyt." },
        { key: "termagia_bővítés", cim: "Tudat kiterjesztése végtelenre és szűkítése atomra", leiras: "Terjeszd ki tudatodat a végtelenbe, majd szűkítsd egy paránnyi pontba. Addig végezd, míg természetessé válik." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (V.) — Elemkiárasztás Kívülre",
      leiras: "Az elemlégzéssel összegyűjtött energiát kívülre, a testből is lehet kiáramoltatni, majd test nélkül is.",
      gyakorlatok: [
        { key: "elemkiaraszt_plexus", cim: "Elemkiárasztás kívülre — Plexus Solarison át", leiras: "A testben torlaszolt elemet a napfonat-chakrán (szoláris plexus) át áramoltatd ki a levegőbe." },
        { key: "elemkiaraszt_kez", cim: "Elemkiárasztás kézből/ujjakból", leiras: "A kezedben összegyűjtött elemet az ujjbegyeken áramoltatd ki különleges dinamikával." },
        { key: "kulso_kiaraszt", cim: "Külső, test nélküli kiárasztás", leiras: "Közvetlenül a levegőből, test közvetítése nélkül töltsd fel egy tér kívánt elemmel." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (V.) — Passzív Érintkezés a Láthatatlannal",
      leiras: "Előkészület és megvalósítás: kapcsolat saját védőszellemmel és elhunytakkal.",
      gyakorlatok: [
        { key: "kez_szabadda", cim: "Saját kéz szabaddá tétele", leiras: "A kezet, különösen az ujjakat semlegesítsd minden külső hatástól, hogy kizárólag szellemi ingereket érzékeljenek." },
        { key: "inga_ceruza", cim: "Ujjak előkészítése ingával, ceruzával és körlappal", leiras: "Inga és ceruza segítségével fejleszd az ujjak fogékonyságát szellemi impulzusokra." },
        { key: "passiv_vedoszellem", cim: "Passzív érintkezés saját védőszellemmel", leiras: "Meditatív állapotban fogadj jeleket, üzeneteket saját belső védőszellemed/felsőbb énedtől." },
        { key: "passiv_elhunytak", cim: "Passzív érintkezés elhunytakkal és más lényekkel", leiras: "Passzív médiumszerű fogékonyság kialakítása; az inga vagy a ceruza mozgásán keresztül." }
      ]
    },
    idotartam: "1–2 hónap",
    osszefoglalo: "Térmágia (tudat áthelyezése), elemkiárasztás kívülre, passzív érintkezés a láthatatlannal (védőszellem, elhunytak)."
  },
  {
    id: 6,
    cim: "Hatodik Fokozat",
    rovidcim: "VI. Fokozat",
    icon: "🌀",
    szin: "#818cf8",
    szellem: {
      cim: "Mágikus Szellemiskolázás (VI.) — Saját Szellemre Összpontosítás, Érzékek Tudatosítása",
      leiras: "A szellem (mentáltest) tudatosítása és az érzékek felemelése szellemi szintre.",
      gyakorlatok: [
        { key: "sajat_szellem", cim: "Saját szellemre összpontosítás", leiras: "Meditálj saját szellemedről mint négy elem összjátékáról: TŰZ→akarat, VÍZ→érzés, LEVEGŐ→intellektus, FÖLD→tudat." },
        { key: "erzekek_szellemi", cim: "Az érzékek tudatosítása szellemi szinten", leiras: "Minden érzékszervedet (látás, hallás stb.) emeld szellemi szintre; érzékelj szellemileg is, nemcsak fizikailag." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (VI.) — Az Akasha-elv Uralása",
      leiras: "Az ötödik elem, az Akasha-elv megismerése és alkalmazása: transzállapot és elemuralom.",
      gyakorlatok: [
        { key: "akasha_elokeszit", cim: "Az Akasha-elv uralásának előkészítése", leiras: "Mély meditáció az Akasha-elvről: minden dolog oka, a tér és idő nélküliség őselvéről." },
        { key: "akasha_transz", cim: "Tudatos transzállapot előidézése az Akasha által", leiras: "Az Akasha-elv segítségével mélytranszba kerülj, miközben megtartod teljes öntudatodat." },
        { key: "akasha_elem_ritual", cim: "Elem uralása individuális rituálé által az Akashából", leiras: "Az Akasha semleges állapotából hívj elő bármelyik elemet rituális szándékkal." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (VI.) — Elementálok, Lárvák, Sémák, Fantomok",
      leiras: "Szellemi lények és formák tudatos teremtése.",
      gyakorlatok: [
        { key: "elemental_teremtes", cim: "Elementálok tudatos létrehozása", leiras: "Elemlényeket (tűz-, víz-, levegő-, földelementált) hozz létre szándékkal, adj nekik feladatot, majd oldd fel." },
        { key: "larvak", cim: "Lárvák létrehozása", leiras: "Meghatározott célt betöltő, automatikusan dolgozó gondolatlényeket teremts, majd oldd fel, ha megtették dolgukat." },
        { key: "semak", cim: "Sémák létrehozása", leiras: "Programozott akciót végrehajtó mágikus egységeket hozz létre az astrálon." },
        { key: "fantomok", cim: "Fantomok létrehozása", leiras: "Életszikrával rendelkező, anyagi megjelenést is öltő mágikus lényeket teremts az Akashából." }
      ]
    },
    idotartam: "2–3 hónap",
    osszefoglalo: "Saját szellem tudatosítása, Akasha-elv uralása (transzállapot, elem-rituálé), elementálok/lárvák/sémák/fantomok teremtése."
  },
  {
    id: 7,
    cim: "Hetedik Fokozat",
    rovidcim: "VII. Fokozat",
    icon: "👁️",
    szin: "#a78bfa",
    szellem: {
      cim: "Mágikus Szellemiskolázás (VII.) — A Szellem Elemzése a Gyakorlatra Vonatkozóan",
      leiras: "A szellem négy elemének részletes elemzése és alkalmazása, beleértve a fény és TŰZ elem kölcsönös átalakulását.",
      gyakorlatok: [
        { key: "szellem_elemzes", cim: "A szellem elemeinek elemzése", leiras: "Mélyítsd el minden elemnek (TŰZ/Levegő/VÍZ/FÖLD) a szellemben betöltött szerepét; akarat, intellektus, érzés, tudat." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (VII.) — Asztrális Érzékek Fejlesztése",
      leiras: "Asztrális tisztánlátás, tisztánhallás és tisztánérzés fejlesztése elemek és fluidikus kondenzátorok segítségével.",
      gyakorlatok: [
        { key: "asztralis_latás", cim: "Asztrális Tisztánlátás fejlesztése", leiras: "Fluidikus kondenzátor segítségével fejleszd az asztrális látást; előbb statikus képeket, majd mozgást érzékelj." },
        { key: "asztralis_halles", cim: "Asztrális Tisztánhallás fejlesztése", leiras: "Az asztrális hallás: hangok, szavak érzékelése fizikai forrás nélkül, kontrollált körülmények között." },
        { key: "asztralis_erzes", cim: "Asztrális Tisztánérzés fejlesztése", leiras: "Az asztrális tapintás és érzékelés: mások érzéseinek, fizikai állapotának empátiás észlelése." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (VII.) — Elementárok Megalkotásának Négy Módszere, Mágikus Kép-életrekeltés",
      leiras: "Fejlett teremtő technikák elementárokhoz és képek megelevenítéséhez.",
      gyakorlatok: [
        { key: "elemental_4modszer", cim: "Elementárok négy alapmódszere", leiras: "1. Gondolati teremtés. 2. Asztrális anyag alakítása. 3. Elektro/mágneses fluidumból alkotás. 4. Akasha-elvből közvetlen teremtés." },
        { key: "kep_eletrekelt", cim: "Mágikus Kép-életrekeltés", leiras: "Egy festményt, szobrot vagy mentális képet olyan szinten töltesz fel élettel, hogy az önállóan is képes cselekedni." }
      ]
    },
    idotartam: "2–4 hónap",
    osszefoglalo: "Szellem elemzése, asztrális tisztánlátás/tisztánhallás/tisztánérzés, elementárok négy módszerrel, képek megelevenítése."
  },
  {
    id: 8,
    cim: "Nyolcadik Fokozat",
    rovidcim: "VIII. Fokozat",
    icon: "🌙",
    szin: "#64748b",
    szellem: {
      cim: "Mágikus Szellemiskolázás (VIII.) — Mentális Vándorlás",
      leiras: "A mentáltest elválasztása az anyagi testtől és tudatos mentális utazás különböző helyekre.",
      gyakorlatok: [
        { key: "mentalis_elokeszit", cim: "Előkészületek a mentális vándorláshoz", leiras: "Relaxáció, légzés, és a tudat elváló érzésének fokozatos kialakítása." },
        { key: "mentalis_szoba", cim: "Mentális vándorlás: szobában", leiras: "Elsőként a saját szobádban vándorolj mentálisan; szemléld magad kívülről és az ismert tárgyakat." },
        { key: "mentalis_rovid", cim: "Mentális vándorlás: rövid útszakaszon", leiras: "Terjeszd ki a mentális utazást rövid ismert útszakaszokra, utcákra." },
        { key: "mentalis_ismerosok", cim: "Mentális látogatás ismerősöknél, rokonoknál", leiras: "Látogasd meg mentálisan ismerős személyeket és ellenőrizd megfigyeléseidet fizikailag is." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (VIII.) — A Nagy 'MOST', Fluidumok Uralása",
      leiras: "Az Akasha-féle időtlenség megtapasztalása, elektromos és mágneses fluidum uralása.",
      gyakorlatok: [
        { key: "nagy_most", cim: "A nagy 'MOST' — Időtlenség megtapasztalása", leiras: "Merülj teljesen a jelen pillanatba; múlt és jövő eltűnik, kizárólag a 'most' létezik." },
        { key: "ne_ragaszkodj", cim: "Ne ragaszkodjunk a múlthoz", leiras: "Tudatosan elengedni a múlt eseményeit, megbántottságait; a mágus nem cipel felesleges terheket." },
        { key: "elektromos_fluidum", cim: "Az elektromos fluidum uralása (induktív és deduktív módszer)", leiras: "Az elektromos fluidum: a TŰZ-elem aktív, kiterjeszkedő aspektusa. Indukció: összegyűjtés kívülről. Dedukció: saját testből kiáramoltatás." },
        { key: "magnetikus_fluidum", cim: "A mágneses fluidum uralása (induktív és deduktív módszer)", leiras: "A mágneses fluidum: a VÍZ-elem passzív, vonzó aspektusa. Gyógyításban, vonzásban alkalmazható." },
        { key: "elektromagnetikus_fluidum", cim: "Az elektromágneses fluidum uralása", leiras: "A két fluidum kombinációja: az universumban a teremtés alapereje. Legerősebb mágiás eszköz." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (VIII.) — Elemek Általi Befolyásolás, Fluidikus Kondenzátorok, Mágikus Tükör",
      leiras: "Mágikus tárgyak készítése és az elemek befolyásoló ereje.",
      gyakorlatok: [
        { key: "elemek_befolyasolás", cim: "Mágikus befolyásolás az elemek által (Tűz/Levegő/Víz/Föld)", leiras: "Tűz: égetés (negatív hatások megsemmisítése). Levegő: elpárologtatás. Víz: elkeverés. Föld: elrothasztás — mind mágikus módszerek problémák feloldására." },
        { key: "egyszerű_kondenzt", cim: "Egyszerű fluidikus kondenzátor előállítása", leiras: "Növényi főzet (pl. kamilla) fluidikus kondenzátorként való elkészítése, amely elektromágneses erőt tárol." },
        { key: "osszetett_kondenzt", cim: "Összetett fluidikus kondenzátor előállítása", leiras: "Arany- és ezüsttartalmú összetett kondenzátor elkészítése." },
        { key: "magikus_tukor_keszit", cim: "Mágikus tükör készítése fluidikus kondenzátorral", leiras: "Üvegtárcsa vagy tükör feltöltése fluidikus kondenzátorral és saját elektromágneses fluidummal." }
      ]
    },
    idotartam: "2–4 hónap",
    osszefoglalo: "Mentális vándorlás, nagy 'MOST', elektromágneses fluidumok uralása, elemek általi befolyásolás, fluidikus kondenzátorok és mágikus tükör készítése."
  },
  {
    id: 9,
    cim: "Kilencedik Fokozat",
    rovidcim: "IX. Fokozat",
    icon: "🪞",
    szin: "#f9a8d4",
    szellem: {
      cim: "Mágikus Szellemiskolázás (IX.) — Tisztánlátás Mágikus Tükrökkel",
      leiras: "A mágikus tükör mint az érzékek kiterjesztésének fő eszköze, időn és téren át.",
      gyakorlatok: [
        { key: "tukortöltés", cim: "A mágikus tükör telítése", leiras: "Töltsd fel a mágikus tükröt elektromágneses fluidummal és saját asztrális energiáddal; szándékot és célt adj neki." },
        { key: "tukorbetegkez", cim: "Mágikus tükör mint távolbalátó eszköz (tér/idő)", leiras: "A tükrön keresztül távolba láss, múltat/jelent/jövőt kutass." },
        { key: "tukorbefoly", cim: "Mágikus tükör mint befolyásoló eszköz", leiras: "A tükrön keresztül pozitív energiát, erőt sugarazd ki betegekre, helyzetekre." },
        { key: "tukortavolhat", cim: "Mágikus tükör mint adó-vevő készülék (kommunikáció)", leiras: "Élő személyekkel és más lényekkel való kommunikáció a tükrön át." },
        { key: "tukorvedo", cim: "Mágikus tükör mint védő eszköz", leiras: "Káros és nemkívánatos befolyásokat fordíts vissza a tükörrel." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (IX.) — Asztráltest Elválasztása, Isteni Alaptulajdonságok",
      leiras: "Az asztráltest tudatos elválasztása a fizikai testtől és feltöltése négy isteni alaptulajdonsággal.",
      gyakorlatok: [
        { key: "asztralist_elvalaszt", cim: "Az asztráltest tudatos elválasztása az anyagi testtől", leiras: "Az asztráltest — a lélek testfüggelén — teljes öntudattal, akaratból hagyja el a fizikai testet és tér vissza." },
        { key: "asztralist_istenialap", cim: "Az asztráltest feltöltése négy isteni alaptulajdonsággal", leiras: "Az asztráltest átitatása az isteni Szeretettel, Bölcsességgel, Akarattal/Erővel és Tudattal." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (IX.) — Betegkezelés, Talizmánok, Kívánság-megvalósítás",
      leiras: "Gyógyítás elektromágneses fluidummal, talizmánok és amulettek feltöltése, kívánság-megvalósítás az Akashában.",
      gyakorlatok: [
        { key: "betegkez_fluidum", cim: "Betegkezelés elektromágneses fluidummal", leiras: "Beteg személyek gyógyítása kézrátételéssel vagy távolból az elektromágneses fluidum áramoltatásával." },
        { key: "talizmantoltes", cim: "Talizmánok, amulettek és drágakövek mágikus telítése (10 módszer)", leiras: "10 különböző módszer tárgyak elektromágneses/asztrális energiával való telítésére, meghatározott szándékkal." },
        { key: "kivanság_akasha", cim: "Kívánság-megvalósítás az Akashában elektromágneses töltéssel ('Voltozás')", leiras: "A kívánságot elektromágneses golyóba zárva az Akasha síkjára helyezed, ahol automatikusan megvalósulásra törekszik." }
      ]
    },
    idotartam: "3–6 hónap",
    osszefoglalo: "Tisztánlátás mágikus tükrökkel, asztráltest elválasztása, betegkezelés fluidummal, talizmánok 10 módszerrel való telítése, kívánság-megvalósítás az Akashában."
  },
  {
    id: 10,
    cim: "Tizedik Fokozat",
    rovidcim: "X. Fokozat",
    icon: "✨",
    szin: "#fbbf24",
    szellem: {
      cim: "Mágikus Szellemiskolázás (X.) — A Szellem Felemelése a Magasabb Síkokra",
      leiras: "A mentáltest tudatos felemelése a fizikai és asztrális sík fölötti mentális síkokra, majd még magasabbra.",
      gyakorlatok: [
        { key: "szellem_emelese", cim: "A szellem felemelése a magasabb síkokra", leiras: "A tudat szándékos áthelyezése a mentális síkra, majd az azontúli síkokra. A fizikai világ ideiglenesen teljesen eltűnik." }
      ]
    },
    lelek: {
      cim: "Mágikus Lélekiskolázás (X.) — Kapcsolat a Személyes Istennel és Istenségekkel",
      leiras: "A legmagasabb szintű lelki kapcsolat: tudatos érintkezés saját személyes istenséggel és más szellemi hierarchiákkal.",
      gyakorlatok: [
        { key: "sajat_isten", cim: "Tudatos kapcsolat a saját személyes Istennel", leiras: "A saját belső isteni szikrával, Felsőbb Énnel való tudatos, közvetlen és kétirányú kommunikáció." },
        { key: "istenségek", cim: "Érintkezés istenségekkel és szellemi hierarchiákkal", leiras: "A mágus képes az Akasha síkján istenségekkel, ősangyalokkal, más szellemi lényekkel kommunikálni és velük együttműködni." }
      ]
    },
    test: {
      cim: "Mágikus Testiskolázás (X.) — Mágikus Képességek Különböző Módszerei",
      leiras: "Az összes korábbi fokozat szintézise; a mágus képes a leírt összes jelenséget előidézni az univerzális törvények alapján.",
      gyakorlatok: [
        { key: "magikus_kepessegek", cim: "Különböző módszerek mágikus képességek elérésére", leiras: "Időjárás befolyásolás, gyógyítás, élettér harmonizálás, halottakkal való kommunikáció, és más magasabb mágikus munkák." }
      ]
    },
    idotartam: "Egyéni — ez a tanfolyam lezárása",
    osszefoglalo: "A szellem felemelése magasabb síkokra, tudatos kapcsolat a személyes Istennel és istenségekkel, összes mágikus képesség szintézise."
  }
];

export type MagiaSection = 'szellem' | 'lelek' | 'test';
