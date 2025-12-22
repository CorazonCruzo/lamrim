import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="home-page">
      <h1>Ламрим Ченмо</h1>
      <p>Большое руководство к этапам Пути Пробуждения</p>
      <p>Чже Цонкапа</p>
      <Link to="/read/1-01" className="btn-primary">
        Начать чтение
      </Link>
    </div>
  );
}
