import { useMemo, useState } from "react";
import { roomController } from "../controllers/roomController.js";
import { bookingController } from "../controllers/bookingController.js";
import { catalogController } from "../controllers/catalogController.js";

const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const initialRooms = roomController.list();

export default function App() {
  const [page, setPage] = useState("Home");
  const [rooms, setRooms] = useState(initialRooms);
  const [bookings, setBookings] = useState(bookingController.list());
  const [search, setSearch] = useState({ checkIn: "", checkOut: "", guests: "2", type: "All" });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [notice, setNotice] = useState("");
  const services = catalogController.services();
  const reviews = catalogController.reviews();
  const filtered = useMemo(() => rooms.filter(r => (search.type === "All" || r.type === search.type) && r.capacity >= Number(search.guests)), [rooms, search.type, search.guests]);

  function runSearch(e) {
    e.preventDefault();
    try {
      const result = roomController.search(search);
      setRooms(result); setNotice(`${result.length} room option(s) found.`);
      setPage("Rooms");
    } catch (err) { setNotice(err.message); }
  }
  function bookRoom(room) {
    if (!search.checkIn || !search.checkOut) { setNotice("Please select check-in and check-out dates first."); setPage("Rooms"); return; }
    try {
      const created = bookingController.create({ roomId: room.id, ...search, customerName: "Demo Customer" });
      setBookings(bookingController.list()); setSelectedRoom(null); setNotice(`Booking ${created.id} created. Status: Pending Payment.`); setPage("Bookings");
    } catch (err) { setNotice(err.message); }
  }
  function cancel(id) { bookingController.cancel(id); setBookings(bookingController.list()); setNotice(`Booking ${id} cancelled in demo data.`); }
  function pay(id) { bookingController.pay(id); setBookings(bookingController.list()); setNotice(`Payment simulated for ${id}. No real payment was processed.`); }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setPage("Home"); setRooms(initialRooms); }}>STAY<span>EASE</span></button>
      <nav>{["Home", "Rooms", "Services", "Bookings", "Reviews", "Dashboard"].map(item => <button key={item} className={page === item ? "nav-link active" : "nav-link"} onClick={() => setPage(item)}>{item}</button>)}</nav>
      <button className="outline-btn" onClick={() => setPage("Login")}>Sign in</button>
    </header>
    {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
    {page === "Home" && <main>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">YOUR STAY, MADE SIMPLE</p><h1>Find a place<br/>to <em>feel at home.</em></h1><p className="hero-sub">Thoughtful rooms, seamless booking, and little details that make every trip memorable.</p><button className="primary-btn" onClick={() => setPage("Rooms")}>Explore rooms <span>↗</span></button></div>
        <div className="hero-image"><div className="floating-note"><span>✦ GUEST FAVORITE</span><strong>Rest well.<br/>Travel better.</strong></div></div>
      </section>
      <SearchPanel search={search} setSearch={setSearch} onSubmit={runSearch}/>
      <section className="section"><div className="section-heading"><div><p className="eyebrow">CURATED FOR YOU</p><h2>Rooms worth staying for</h2></div><button className="text-btn" onClick={() => setPage("Rooms")}>View all rooms ↗</button></div><RoomGrid rooms={initialRooms.slice(0,3)} onSelect={setSelectedRoom} onBook={bookRoom}/></section>
      <section className="service-strip"><div><p className="eyebrow">MORE THAN A ROOM</p><h2>Make your stay<br/>a little more special.</h2></div>{services.map(s=><div className="service-mini" key={s.id}><span className="service-icon">{s.id===1?"↗":s.id===2?"✧":"☼"}</span><h3>{s.name}</h3><p>{s.description}</p><strong>{money(s.price)} <small>/ {s.unit}</small></strong></div>)}</section>
    </main>}
    {page === "Rooms" && <main className="page-content"><p className="eyebrow">FIND YOUR ROOM</p><h1 className="page-title">Rooms & suites</h1><SearchPanel search={search} setSearch={setSearch} onSubmit={runSearch}/><RoomGrid rooms={filtered} onSelect={setSelectedRoom} onBook={bookRoom}/>{filtered.length===0&&<div className="empty">No rooms match these filters. Try changing your guest count or room type.</div>}</main>}
    {page === "Services" && <main className="page-content"><p className="eyebrow">PERSONALIZE YOUR VISIT</p><h1 className="page-title">Hotel services</h1><div className="service-grid">{services.map(s=><article className="service-card" key={s.id}><span className="service-icon">{s.id===1?"↗":s.id===2?"✧":"☼"}</span><h2>{s.name}</h2><p>{s.description}</p><strong>{money(s.price)} <small>/ {s.unit}</small></strong><button className="outline-btn" onClick={()=>setNotice(`${s.name}: service booking UI placeholder. Connect backend to submit a real service booking.`)}>Book service</button></article>)}</div></main>}
    {page === "Bookings" && <main className="page-content"><p className="eyebrow">YOUR TRAVEL PLANS</p><h1 className="page-title">Booking history</h1><div className="table-wrap"><table><thead><tr><th>Booking</th><th>Room</th><th>Stay</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>{bookings.map(b=><tr key={b.id}><td><strong>{b.id}</strong><small>{b.customerName}</small></td><td>{b.roomName}</td><td>{b.checkIn}<small>to {b.checkOut}</small></td><td>{money(b.total)}</td><td><span className={`status ${b.status.toLowerCase().replaceAll(" ","-")}`}>{b.status}</span></td><td className="actions">{b.status==="Pending Payment"&&<button onClick={()=>pay(b.id)}>Pay (demo)</button>}{["Pending Payment","Confirmed"].includes(b.status)&&<button onClick={()=>cancel(b.id)}>Cancel</button>}</td></tr>)}</tbody></table></div><p className="hint">Demo only: booking data is stored in browser memory and resets on refresh. Payment is simulated.</p></main>}
    {page === "Reviews" && <main className="page-content"><p className="eyebrow">GUEST STORIES</p><h1 className="page-title">Kind words from our guests</h1><div className="review-grid">{reviews.map(r=><article className="review-card" key={r.id}><div className="stars">{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</div><p>“{r.text}”</p><strong>{r.author}</strong></article>)}</div><p className="hint">Submitting a review requires a completed stay. Connect the backend to persist new reviews.</p></main>}
    {page === "Dashboard" && <main className="page-content"><p className="eyebrow">OPERATIONS OVERVIEW</p><h1 className="page-title">Staff dashboard</h1><div className="stats-grid"><Stat label="Room types" value={catalogController.roomTypes().length}/><Stat label="Rooms in catalog" value={initialRooms.length}/><Stat label="Bookings" value={bookings.length}/><Stat label="Customers (demo)" value={catalogController.customers().length}/></div><div className="section"><h2>Manage bookings</h2><p className="hint">Use Booking History above to test status changes. Room, customer, discount-code and service management screens should be connected to secured backend APIs.</p></div></main>}
    {page === "Login" && <main className="auth-wrap"><div className="auth-card"><p className="eyebrow">WELCOME BACK</p><h1>Sign in</h1><p>This frontend prototype does not authenticate users yet.</p><label>Email<input type="email" placeholder="you@example.com"/></label><label>Password<input type="password" placeholder="Enter your password"/></label><button className="primary-btn full" onClick={()=>setNotice("Login is a frontend placeholder. Connect the authentication API to enable sign in.")}>Sign in</button><button className="text-btn" onClick={()=>setNotice("Registration UI/API has not been wired up yet.")}>Create an account</button></div></main>}
    <footer><button className="brand" onClick={()=>setPage("Home")}>STAY<span>EASE</span></button><p>Comfort in every detail. © 2026 StayEase demo.</p><div>Hotel Booking · React prototype</div></footer>
    {selectedRoom && <div className="modal-backdrop" onClick={()=>setSelectedRoom(null)}><section className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelectedRoom(null)}>×</button><img src={selectedRoom.image} alt={selectedRoom.name}/><p className="eyebrow">{selectedRoom.type} ROOM</p><h2>{selectedRoom.name}</h2><p>{selectedRoom.description}</p><p>{selectedRoom.beds} · Up to {selectedRoom.capacity} guests</p><div className="amenities">{selectedRoom.amenities.map(a=><span key={a}>{a}</span>)}</div><strong className="modal-price">{money(selectedRoom.price)} <small>/ night</small></strong><button className="primary-btn full" onClick={()=>bookRoom(selectedRoom)}>Book this room</button></section></div>}
  </div>;
}
function SearchPanel({search,setSearch,onSubmit}) {
  return <form className="search-panel" onSubmit={onSubmit}><label>CHECK IN<input type="date" value={search.checkIn} min={new Date().toISOString().slice(0,10)} onChange={e=>setSearch({...search,checkIn:e.target.value})} required/></label><label>CHECK OUT<input type="date" value={search.checkOut} min={search.checkIn||new Date().toISOString().slice(0,10)} onChange={e=>setSearch({...search,checkOut:e.target.value})} required/></label><label>GUESTS<select value={search.guests} onChange={e=>setSearch({...search,guests:e.target.value})}><option value="1">1 Guest</option><option value="2">2 Guests</option><option value="3">3 Guests</option><option value="4">4 Guests</option></select></label><label>ROOM TYPE<select value={search.type} onChange={e=>setSearch({...search,type:e.target.value})}><option>All</option><option>Superior</option><option>Deluxe</option><option>Suite</option></select></label><button className="primary-btn search-btn" type="submit">Search rooms ↗</button></form>;
}
function RoomGrid({rooms,onSelect,onBook}) {
  return <div className="room-grid">{rooms.map(r=><article className="room-card" key={r.id}><button className="room-image-btn" onClick={()=>onSelect(r)}><img src={r.image} alt={r.name}/><span>{r.type}</span></button><div className="room-info"><div className="room-title-row"><h3>{r.name}</h3><span className="rating">★ 4.9</span></div><p>{r.beds} · Up to {r.capacity} guests</p><div className="room-bottom"><div><strong>{money(r.price)}</strong><small>/ night</small></div><button className="round-arrow" onClick={()=>onSelect(r)} aria-label={`View ${r.name}`}>↗</button><button className="book-inline" onClick={()=>onBook(r)}>Book</button></div></div></article>)}</div>;
}
function Stat({label,value}) { return <article className="stat-card"><span>{label}</span><strong>{value}</strong></article>; }
