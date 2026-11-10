/**
 * How to export a container from GTM.
 * Wording is deliberately loose about exact menu positions until we have
 * screenshots of the 2026 GTM interface to check against.
 */
interface Step {
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    body: (
      <>
        Open <strong>Google Tag Manager</strong> at tagmanager.google.com and pick the <strong>web container</strong> you want checked. Its ID starts with GTM-.
      </>
    ),
  },
  {
    body: (
      <>
        Open the <strong>Admin</strong> tab, then choose <strong>Export Container</strong> in the Container column.
      </>
    ),
  },
  {
    body: (
      <>
        Choose what to export. A <strong>version</strong> (the published one is what your visitors get today) or a <strong>workspace</strong>, if
        you want to check changes before you publish them.
      </>
    ),
  },
  {
    body: (
      <>
        Select <strong>Export</strong>. Your browser saves a <code className="hl">.json</code> file named like <code className="hl">GTM-XXXX_v12.json</code>.
        Drop that file here.
      </>
    ),
  },
];

export function ExportHowTo() {
  return (
    <section aria-labelledby="howto-h" className="stack">
      <h2 id="howto-h" className="h3">How to get the file</h2>
      <ol className="howto">
        {STEPS.map((s, i) => (
          <li key={i}>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="note">
        No Export Container option? Your GTM access may not include it. Ask whoever manages the container to export it for you.
      </p>
    </section>
  );
}
