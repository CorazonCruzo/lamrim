import { Link, NavLink } from 'react-router-dom';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header__logo">
        <Link to="/">Lamrim Reader</Link>
      </div>
      <nav className="header__nav">
        <NavLink to="/" end>
          Главная
        </NavLink>
        <NavLink to="/read/1-01">Читать</NavLink>
        <NavLink to="/notes">Заметки</NavLink>
        <NavLink to="/settings">Настройки</NavLink>
      </nav>
    </header>
  );
}
