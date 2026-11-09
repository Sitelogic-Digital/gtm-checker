const cards = [
  { title: "The meter", body: "A lactate meter built for the track, under £200." },
  { title: "Strips, delivered", body: "Lactiq Club sends strips before you run out." },
  { title: "The app", body: "Readings land on the right rep of your workout. Your curve over the block. Zones that update." },
];

export default function Cards() {
  return (
    <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
      {cards.map((c) => (
        <li key={c.title} className="card">
          <h3 className="text-[24px] leading-tight">{c.title}</h3>
          <p className="mt-3 text-[16px] text-text-2">{c.body}</p>
        </li>
      ))}
    </ul>
  );
}
