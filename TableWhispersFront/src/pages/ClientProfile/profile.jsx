import React, {useState} from "react";
import "./profile.css";

const ClientProfile = () => {
  const profile = {
    firstName: "ישראל",
    lastName: "ישראלי",
    age: 30,
    email: "israel@example.com",
    phoneNumber: "050-1234567",
    profileImage: "https://via.placeholder.com/150",
    allergies: ["בוטנים", "חלב", "ביצים"],
    upcomingReservations: [
      {
        _id: 1,
        date: "2024-02-01",
        time: "19:00",
        numberOfGuests: 4,
        specialRequests: "שולחן ליד החלון"
      },
      {
        _id: 2,
        date: "2024-02-15",
        time: "20:30",
        numberOfGuests: 2
      }
    ],
    pastReservations: [
      {
        _id: 3,
        date: "2024-01-10",
        time: "18:00",
        numberOfGuests: 3
      },
      {
        _id: 4,
        date: "2024-01-05",
        time: "19:30",
        numberOfGuests: 6,
        specialRequests: "תפריט טבעוני"
      }
    ]
  };

  const [activeTab, setActiveTab] = useState('upcoming');

  return (
    <div className="profile-container">
      {/* מידע אישי */}
      <div className="profile-card">
        <div className="profile-header">
          {/* תמונת פרופיל */}
          <div className="profile-image">
            <img src={profile.profileImage} alt="Profile" />
          </div>
          
          {/* פרטים אישיים */}
          <div className="profile-details">
            <h1>{profile.firstName} {profile.lastName}</h1>
            <div className="details-grid">
              <div className="detail-item">
                <p className="detail-label">גיל</p>
                <p className="detail-value">{profile.age}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">טלפון</p>
                <p className="detail-value">{profile.phoneNumber}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">דוא"ל</p>
                <p className="detail-value">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* אלרגיות */}
      <div className="profile-card">
        <h2>אלרגיות</h2>
        {profile.allergies && profile.allergies.length > 0 ? (
          <div className="allergies-container">
            {profile.allergies.map((allergy, index) => (
              <span key={index} className="allergy-tag">{allergy}</span>
            ))}
          </div>
        ) : (
          <p className="no-data">לא נרשמו אלרגיות</p>
        )}
      </div>

      {/* הזמנות */}
      <div className="profile-card">
        <h2>הזמנות</h2>
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            הזמנות עתידיות
          </button>
          <button 
            className={`tab-button ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            הזמנות קודמות
          </button>
        </div>
        
        <div className="reservations-list">
          {activeTab === 'upcoming' ? (
            profile.upcomingReservations?.length > 0 ? (
              profile.upcomingReservations.map(reservation => (
                <ReservationCard key={reservation._id} reservation={reservation} />
              ))
            ) : (
              <p className="no-data">אין הזמנות עתידיות</p>
            )
          ) : (
            profile.pastReservations?.length > 0 ? (
              profile.pastReservations.map(reservation => (
                <ReservationCard key={reservation._id} reservation={reservation} />
              ))
            ) : (
              <p className="no-data">אין הזמנות קודמות</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const ReservationCard = ({ reservation }) => {
  return (
    <div className="reservation-card">
      <div className="reservation-header">
        <p className="reservation-date">
          {new Date(reservation.date).toLocaleDateString('he-IL')} בשעה {reservation.time}
        </p>
        <p className="guests-count">
          {reservation.numberOfGuests} {reservation.numberOfGuests === 1 ? 'סועד' : 'סועדים'}
        </p>
      </div>
      {reservation.specialRequests && (
        <p className="special-requests">
          בקשות מיוחדות: {reservation.specialRequests}
        </p>
      )}
    </div>
  );
};

export default ClientProfile;