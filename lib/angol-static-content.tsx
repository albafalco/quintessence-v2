export function SzolapMagyarazat() {
  return (
    <article className="prose prose-invert max-w-none space-y-8 text-foreground">
      <header>
        <h1 className="font-display text-3xl font-bold text-primary">Szólap Magyarázat</h1>
        <p className="text-muted-foreground">
          A szólap szavainak használata és jelentésbeli árnyalatai — magyarázat kezdőknek.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">Névelők és mutatók</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p>
            <strong className="text-primary">a / an</strong> — határozatlan névelő: „egy”. Az <em>an</em> magánhangzóval
            kezdődő szó előtt használjuk (<em>an old flat</em>, <em>an interesting story</em>).
          </p>
          <p>
            <strong className="text-primary">the</strong> — határozott névelő: „a, az”. Konkrét, ismert dolgot jelöl
            (<em>the family</em> = az adott család).
          </p>
          <p>
            <strong className="text-primary">this / that</strong> — mutató névmások: <em>this</em> = ez a (közel),
            <em>that</em> = az a (távol). Főnév előtt névelő nélkül állnak: <em>this house</em>, <em>that car</em>.
          </p>
          <p>
            <strong className="text-primary">which</strong> — „melyik” kérdő szó: <em>which house?</em>
          </p>
          <p>
            <strong className="text-primary">every</strong> — „minden”: <em>every child</em> = minden gyerek.
          </p>
          <p>
            <strong className="text-primary">whose</strong> — „kinek a”: <em>whose house?</em> = kinek a háza?
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">Birtokos névmások</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">Magyar</th>
                <th className="pb-2">Angol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr><td className="py-2 pr-4">az én</td><td>my</td></tr>
              <tr><td className="py-2 pr-4">a te</td><td>your (tegezés)</td></tr>
              <tr><td className="py-2 pr-4">az ő (hímnem)</td><td>his</td></tr>
              <tr><td className="py-2 pr-4">az ő (nőnem)</td><td>her</td></tr>
              <tr><td className="py-2 pr-4">annak a (semleges)</td><td>its</td></tr>
              <tr><td className="py-2 pr-4">a mi</td><td>our</td></tr>
              <tr><td className="py-2 pr-4">a ti</td><td>your (többes tegezés)</td></tr>
              <tr><td className="py-2 pr-4">az ők</td><td>their</td></tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <p>
            <strong>your</strong> négy jelentése: 1) tegező <em>your</em>, 2) magázó <em>your</em> (az Ön),
            3) többes tegező <em>your</em> (a ti), 4) magázó többes <em>your</em> (az Önök). A kontextus
            dönti el, melyikről van szó.
          </p>
          <p>
            <strong>his / her / its</strong>: <em>his</em> férfi után, <em>her</em> nő után, <em>its</em> tárgy
            vagy állat után (<em>its house</em>).
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">Személyes névmások</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p>
            <strong>he / she</strong> — „ő”: <em>he</em> férfi, <em>she</em> nő. Önálló mondatban:
            <em> He is young.</em> / <em>She is beautiful.</em>
          </p>
          <p>
            <strong>it</strong> — „az, ez” tárgyakra, fogalmakra: <em>It is true.</em> = Ez igaz.
          </p>
          <p>
            <strong>it vs this/that</strong>: <em>this</em> és <em>that</em> konkrétabb mutatás;
            <em>it</em> általánosabb, absztrakt (<em>It is possible.</em> = Lehetséges).
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">Idő és hely kifejezések</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p><strong>here / there</strong> — itt / ott</p>
          <p><strong>at home</strong> — otthon (<em>at home</em>, nem <em>in home</em>)</p>
          <p><strong>near / far</strong> — közel / távol</p>
          <p>
            <strong>still vs already</strong>: <em>still</em> = még (folytatódik),
            <em>already</em> = már (megtörtént). <em>He is still here.</em> vs <em>He is already at home.</em>
          </p>
          <p>
            <strong>enough</strong> — elég. Általában melléknév <strong>után</strong> áll:
            <em>near enough</em>, <em>good enough</em>.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">Melléknevek foka</h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2">Pozitív — komparatív — szuperlatív:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><em>good</em> → <em>better</em> → <em>the best</em></li>
            <li><em>big</em> → <em>bigger</em> → <em>the biggest</em> (szabályos: -er / -est)</li>
            <li><em>beautiful</em> → <em>more beautiful</em> → <em>the most beautiful</em> (hosszú melléknevek)</li>
          </ul>
        </div>
      </section>
    </article>
  );
}

export function NyelvtanI() {
  return (
    <article className="prose prose-invert max-w-none space-y-8 text-foreground">
      <header>
        <h1 className="font-display text-3xl font-bold text-primary">Nyelvtan I.</h1>
        <p className="text-muted-foreground">
          Az angol mondat alapvető szerkezete — névelők, ige, szórend.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">ABC szerkezetek</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p>Az angol mondat három fő részből épül fel:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-primary">A</strong> — alany (ki? mi?): <em>the child</em>, <em>Peter</em>, <em>she</em></li>
            <li><strong className="text-primary">B</strong> — állítmány / ige: <em>is</em>, <em>was</em></li>
            <li><strong className="text-primary">C</strong> — mondatrész (melléknév, hely, stb.): <em>happy</em>, <em>here</em></li>
          </ul>
          <p className="text-muted-foreground">
            Példa: <em>[A: The child] [B: is] [C: happy].</em> = A gyerek boldog.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">Határozatlan névelő: a / an</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p>Jelentése: „egy” (nem konkrét, először említett).</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><em>a</em> — mássalhangzó előtt: <em>a house</em>, <em>a car</em></li>
            <li><em>an</em> — magánhangzó előtt: <em>an old flat</em>, <em>an idea</em></li>
          </ul>
          <p className="text-muted-foreground">
            Hangzás számít, nem írásmód: <em>an hour</em> (óra — néma h), <em>a university</em> (egyetem — /j/ hang).
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">Határozott névelő: the</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p>Jelentése: „a, az” — ismert, konkrét dolog.</p>
          <p><em>the family</em> = a (már ismert) család</p>
          <p><em>the best answer</em> = a legjobb válasz (felsőfok előtt mindig <em>the</em>)</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">is → he&apos;s / she&apos;s</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p>Az <em>is</em> ige összevonható a névmással:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><em>he is</em> → <em>he&apos;s</em></li>
            <li><em>she is</em> → <em>she&apos;s</em></li>
            <li><em>it is</em> → <em>it&apos;s</em></li>
          </ul>
          <p className="text-muted-foreground">
            Példa: <em>He&apos;s a teacher.</em> = Ő tanár. / <em>She&apos;s at home.</em> = Otthon van.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">A mondat négy alaptípusa</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3">Típus</th>
                <th className="p-3">Szerkezet</th>
                <th className="p-3">Példa</th>
                <th className="p-3">Magyar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3 font-medium text-primary">Állító</td>
                <td className="p-3">A + B + C</td>
                <td className="p-3"><em>She is happy.</em></td>
                <td className="p-3">Ő boldog.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-primary">Kérdő</td>
                <td className="p-3">B + A + C (?)</td>
                <td className="p-3"><em>Is she happy?</em></td>
                <td className="p-3">Boldog ő?</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-primary">Tagadó</td>
                <td className="p-3">A + B + not + C</td>
                <td className="p-3"><em>She is not happy.</em></td>
                <td className="p-3">Ő nem boldog.</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-primary">Kérdve-tagadó</td>
                <td className="p-3">B + A + not + C (?)</td>
                <td className="p-3"><em>Is she not happy?</em></td>
                <td className="p-3">Nem boldog ő?</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-accent">Szórend: 1-2-3 rendszer</h2>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p>Az angol alap szórend:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>1. hely</strong> — alany (A): <em>The child</em></li>
            <li><strong>2. hely</strong> — ige (B): <em>is</em></li>
            <li><strong>3. hely</strong> — kiegészítő (C): <em>happy</em></li>
          </ol>
          <p>
            Kérdésnél a <strong>2. hely (ige)</strong> kerül az <strong>1. hely elé</strong>,
            és a mondat végére <strong>(?)</strong> jel kerül.
          </p>
          <div className="mt-4 rounded border border-primary/30 bg-primary/5 p-3 font-mono text-sm">
            <p>Állító:  <span className="text-primary">[1: She]</span> <span className="text-accent">[2: is]</span> <span className="text-muted-foreground">[3: here].</span></p>
            <p>Kérdő:   <span className="text-accent">[2: Is]</span> <span className="text-primary">[1: she]</span> <span className="text-muted-foreground">[3: here]?</span></p>
          </div>
        </div>
      </section>
    </article>
  );
}

export function getStaticContent(sectionId: number) {
  if (sectionId === 1) return <SzolapMagyarazat />;
  if (sectionId === 2) return <NyelvtanI />;
  return null;
}