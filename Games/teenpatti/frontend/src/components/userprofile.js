import '../style/userprofile.css'


function UserProfile({ src }) {
  return (
    <div className="row userprofile">
      <div className='col profileImg' style={{ backgroundImage: `url(${src})` }}></div>
    </div>
  );
}

export default UserProfile;