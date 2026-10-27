import "../style/profile.css";

function Profile({ name, src }) {
  const renderName = (userName) => {
    if (userName.length > 5) {
      userName = userName.slice(0, 5);
      userName += "..";
    }
    return userName;
  };

  return (
    <div className="col profile">
      <div style={{ backgroundImage: `url(${src})` }}></div>
      <p>{name}</p>
    </div>
  );
}

export default Profile;
