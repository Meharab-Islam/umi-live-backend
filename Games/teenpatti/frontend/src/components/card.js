import "../style/card.css";

function Card({ src, style1 }) {
  return (
    <div
      className="col card"
      style={{ backgroundImage: `url('${src}')` }}
    ></div>
  );
}

export default Card;
