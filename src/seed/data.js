// Sample data for the demo. Every person, address, phone number (555-01xx) and insurance plan is fictional.
// Patient names are DC Comics characters, used only for this fan demo; not affiliated with DC.

// 36 providers: 16 MD, 4 DO, 9 NP, 7 PA.
// hours: [start, end] Mon–Fri; off: weekdays not worked (1 = Monday … 5 = Friday)
export const PROVIDERS = [
  { first: 'Leslie', last: 'Thompkins', credential: 'MD', specialty: 'Family Medicine', room: '1A', hours: ['08:00', '16:30'] },
  { first: 'Marcus', last: 'Hale', credential: 'MD', specialty: 'Family Medicine', room: '1B', hours: ['08:30', '17:00'] },
  { first: 'Ana', last: 'Delgado', credential: 'MD', specialty: 'Family Medicine', room: '1C', hours: ['08:00', '16:00'], off: [5] },
  { first: 'Samuel', last: 'Okafor', credential: 'MD', specialty: 'Internal Medicine', room: '2A', hours: ['08:00', '17:00'] },
  { first: 'Grace', last: 'Whitfield', credential: 'MD', specialty: 'Internal Medicine', room: '2B', hours: ['09:00', '17:00'] },
  { first: 'Ravi', last: 'Menon', credential: 'MD', specialty: 'Internal Medicine', room: '2C', hours: ['08:00', '16:30'], off: [3] },
  { first: 'Elena', last: 'Varga', credential: 'MD', specialty: 'Pediatrics', room: '3A', hours: ['08:00', '16:00'] },
  { first: 'Thomas', last: 'Reyes', credential: 'MD', specialty: 'Pediatrics', room: '3B', hours: ['09:00', '17:00'], off: [1] },
  { first: 'Naomi', last: 'Brandt', credential: 'MD', specialty: 'Cardiology', room: '4A', hours: ['08:00', '16:00'] },
  { first: 'Daniel', last: 'Park', credential: 'MD', specialty: 'Endocrinology', room: '4B', hours: ['08:30', '16:30'] },
  { first: 'Fatima', last: 'Siddiqui', credential: 'MD', specialty: 'Gastroenterology', room: '4C', hours: ['08:00', '15:00'], off: [5] },
  { first: 'Victor', last: 'Lindqvist', credential: 'MD', specialty: 'Neurology', room: '5A', hours: ['09:00', '17:00'] },
  { first: 'Imani', last: 'Carter', credential: 'MD', specialty: 'Pulmonology', room: '5B', hours: ['08:00', '16:00'], off: [2] },
  { first: 'Helen', last: 'Moreau', credential: 'MD', specialty: 'OB/GYN', room: '6A', hours: ['08:00', '17:00'] },
  { first: 'Kenji', last: 'Watanabe', credential: 'MD', specialty: 'Dermatology', room: '6B', hours: ['08:30', '16:30'], off: [4] },
  { first: 'Rachel', last: 'Abrams', credential: 'MD', specialty: 'Psychiatry', room: '7A', hours: ['09:00', '17:00'] },
  { first: 'Owen', last: 'Fitzgerald', credential: 'DO', specialty: 'Family Medicine', room: '1D', hours: ['08:00', '16:30'] },
  { first: 'Priscilla', last: 'Nunez', credential: 'DO', specialty: 'Sports Medicine', room: '8A', hours: ['08:00', '16:00'] },
  { first: 'Gregory', last: 'Adeyemi', credential: 'DO', specialty: 'Orthopedics', room: '8B', hours: ['08:00', '17:00'], off: [3] },
  { first: 'Yasmin', last: 'Haddad', credential: 'DO', specialty: 'Internal Medicine', room: '2D', hours: ['08:30', '17:00'] },
  { first: 'Carla', last: 'Benton', credential: 'NP', specialty: 'Family Medicine', room: '1E', hours: ['08:00', '16:30'] },
  { first: 'Jamal', last: 'Wright', credential: 'NP', specialty: 'Family Medicine', room: '1F', hours: ['09:00', '17:00'], off: [5] },
  { first: 'Sofia', last: 'Lombardi', credential: 'NP', specialty: 'Pediatrics', room: '3C', hours: ['08:00', '16:00'] },
  { first: 'Hannah', last: 'Kowalski', credential: 'NP', specialty: "Women's Health", room: '6C', hours: ['08:00', '16:30'], off: [1] },
  { first: 'Andre', last: 'Baptiste', credential: 'NP', specialty: 'Cardiology', room: '4D', hours: ['08:30', '17:00'] },
  { first: 'Meera', last: 'Iyer', credential: 'NP', specialty: 'Behavioral Health', room: '7B', hours: ['09:00', '17:00'], off: [3] },
  { first: 'Lucas', last: 'Ferreira', credential: 'NP', specialty: 'Urgent Care', room: 'UC1', hours: ['08:00', '17:00'] },
  { first: 'Tessa', last: 'Grant', credential: 'NP', specialty: 'Urgent Care', room: 'UC2', hours: ['08:00', '17:00'] },
  { first: 'Wei', last: 'Zhang', credential: 'NP', specialty: 'Endocrinology', room: '4E', hours: ['08:00', '16:00'], off: [4] },
  { first: 'Brian', last: "O'Connell", credential: 'PA', specialty: 'Orthopedics', room: '8C', hours: ['08:00', '16:30'] },
  { first: 'Lena', last: 'Petrova', credential: 'PA', specialty: 'Orthopedics', room: '8D', hours: ['09:00', '17:00'], off: [2] },
  { first: 'Diego', last: 'Santos', credential: 'PA', specialty: 'Dermatology', room: '6D', hours: ['08:00', '16:00'] },
  { first: 'Keisha', last: 'Morgan', credential: 'PA', specialty: 'Urgent Care', room: 'UC3', hours: ['08:00', '17:00'] },
  { first: 'Ethan', last: 'Brooks', credential: 'PA', specialty: 'Urgent Care', room: 'UC4', hours: ['08:00', '17:00'], off: [1] },
  { first: 'Ruth', last: 'Albright', credential: 'PA', specialty: 'Gastroenterology', room: '4F', hours: ['08:30', '16:30'] },
  { first: 'Omar', last: 'Khalil', credential: 'PA', specialty: 'Family Medicine', room: '1G', hours: ['08:00', '16:30'], off: [4] },
];

export const PRIMARY_CARE = ['Family Medicine', 'Internal Medicine', 'Pediatrics', "Women's Health"];

// Reasons for visit by specialty (used for generated appointments)
export const REASONS = {
  'Family Medicine': ['Annual physical', 'Blood pressure check', 'Cough and congestion', 'Medication refill', 'Lab review', 'Back pain', 'Vaccination', 'Rash', 'Follow-up visit'],
  'Internal Medicine': ['Diabetes management', 'Hypertension follow-up', 'Cholesterol review', 'Annual physical', 'Fatigue', 'Lab review', 'Thyroid follow-up'],
  Pediatrics: ['Well-child visit', 'Ear pain', 'Fever', 'School physical', 'Vaccinations', 'Asthma follow-up', 'Sore throat'],
  Cardiology: ['Chest pain evaluation', 'EKG review', 'Palpitations', 'Heart failure follow-up', 'Echocardiogram results'],
  Endocrinology: ['Diabetes management', 'Thyroid nodule', 'A1C review', 'Insulin adjustment', 'Osteoporosis follow-up'],
  Gastroenterology: ['Acid reflux', 'Abdominal pain', 'Colonoscopy consult', 'IBS follow-up', 'Liver enzymes review'],
  Neurology: ['Migraine follow-up', 'Numbness and tingling', 'Seizure follow-up', 'Memory concerns', 'Dizziness'],
  Pulmonology: ['Asthma follow-up', 'COPD management', 'Shortness of breath', 'Sleep apnea consult', 'Pulmonary function results'],
  'OB/GYN': ['Annual exam', 'Prenatal visit', 'Contraception consult', 'Pelvic pain', 'Postpartum visit'],
  Dermatology: ['Skin check', 'Acne follow-up', 'Mole evaluation', 'Eczema', 'Psoriasis follow-up'],
  Psychiatry: ['Medication management', 'Anxiety follow-up', 'Depression follow-up', 'New patient evaluation', 'Sleep concerns'],
  'Sports Medicine': ['Ankle sprain', 'Knee pain', 'Shoulder pain', 'Concussion follow-up', 'Sports physical'],
  Orthopedics: ['Knee pain', 'Fracture follow-up', 'Hip pain', 'Post-op visit', 'Joint injection', 'Shoulder pain'],
  "Women's Health": ['Annual exam', 'Contraception consult', 'Menopause symptoms', 'UTI symptoms', 'Prenatal visit'],
  'Behavioral Health': ['Therapy session', 'Anxiety follow-up', 'Stress management', 'ADHD follow-up', 'Depression follow-up'],
  'Urgent Care': ['Sore throat', 'Cut on hand', 'Sprained wrist', 'Flu symptoms', 'Ear infection', 'Minor burn', 'Allergic reaction'],
};

export const PAYERS = [
  { payer: 'Gotham Mutual Health', plans: ['Gold PPO', 'Silver HMO', 'Bronze EPO'] },
  { payer: 'Wayne Enterprises Employee Health', plans: ['Premier PPO'] },
  { payer: 'Keystone Health Partners', plans: ['Choice PPO', 'Select HMO'] },
  { payer: 'Metropolis Care Alliance', plans: ['Plus PPO', 'Basic HMO'] },
  { payer: 'Coast City Health Cooperative', plans: ['Standard PPO'] },
  { payer: 'Medicare', plans: ['Part B'] },
  { payer: 'Medicaid', plans: ['Managed Care'] },
];

// DC characters as patients. primary: the provider's last name; visit: a themed upcoming or recent visit.
export const DC_PATIENTS = [
  { first: 'Bruce', last: 'Wayne', sex: 'M', born: '1985-02-19', address: '1007 Mountain Drive', primary: 'Thompkins', payer: 'Wayne Enterprises Employee Health', emergency: ['Alfred Pennyworth', 'Other', '555-0100'], notes: 'Frequent bruises and lacerations; reports "polo injuries."', visit: ['Thompkins', 0, '10:00', 'Follow-up', 'Bruised ribs follow-up'] },
  { first: 'Alfred', last: 'Pennyworth', sex: 'M', born: '1958-04-16', address: '1007 Mountain Drive', primary: 'Thompkins', payer: 'Wayne Enterprises Employee Health', allergies: 'Penicillin', medications: 'Lisinopril 10 mg daily', emergency: ['Bruce Wayne', 'Other', '555-0101'], visit: ['Okafor', 2, '09:00', 'Annual physical', 'Annual physical'] },
  { first: 'Dick', last: 'Grayson', sex: 'M', born: '1999-03-20', city: 'Bludhaven', primary: 'Fitzgerald', payer: 'Keystone Health Partners', emergency: ['Bruce Wayne', 'Parent', '555-0101'], visit: ['Nunez', 1, '11:00', 'Sick visit', 'Shoulder strain from gymnastics'] },
  { first: 'Barbara', last: 'Gordon', sex: 'F', born: '2000-01-11', primary: 'Delgado', payer: 'Gotham Mutual Health', emergency: ['James Gordon', 'Parent', '555-0105'], visit: ['Delgado', 3, '14:00', 'Follow-up', 'Wrist pain from long hours at the keyboard'] },
  { first: 'James', last: 'Gordon', sex: 'M', born: '1962-05-08', primary: 'Okafor', payer: 'Gotham Mutual Health', medications: 'Amlodipine 5 mg daily', notes: 'Hypertension. Drinks 6+ cups of coffee a day.', emergency: ['Barbara Gordon', 'Other', '555-0104'], visit: ['Okafor', 0, '13:30', 'Follow-up', 'Hypertension follow-up'] },
  { first: 'Selina', last: 'Kyle', sex: 'F', born: '1990-06-03', city: 'Gotham', primary: 'Benton', payer: 'Metropolis Care Alliance', allergies: 'None known', notes: 'Lives with several cats.', visit: ['Benton', -3, '15:00', 'Sick visit', 'Scratches on forearms'] },
  { first: 'Harvey', last: 'Dent', sex: 'M', born: '1978-09-12', primary: 'Haddad', payer: 'Gotham Mutual Health', notes: 'History of facial burns; followed by dermatology.', visit: ['Watanabe', 4, '10:30', 'Follow-up', 'Burn scar follow-up'] },
  { first: 'Lucius', last: 'Fox', sex: 'M', born: '1960-10-22', primary: 'Whitfield', payer: 'Wayne Enterprises Employee Health', medications: 'Atorvastatin 20 mg daily', visit: ['Brandt', 5, '08:30', 'Follow-up', 'Cholesterol and EKG review'] },
  { first: 'Pamela', last: 'Isley', sex: 'F', born: '1988-11-02', primary: 'Kowalski', payer: 'Keystone Health Partners', allergies: 'Pesticides (contact dermatitis)', notes: 'Botanist; frequent plant exposure.', visit: ['Santos', 1, '13:00', 'Sick visit', 'Rash after garden work'] },
  { first: 'Victor', last: 'Fries', sex: 'M', born: '1970-01-28', primary: 'Menon', payer: 'Coast City Health Cooperative', notes: 'Prefers a cold exam room.', visit: ['Menon', 6, '09:30', 'Follow-up', 'Cold sensitivity and skin dryness'] },
  { first: 'Harleen', last: 'Quinzel', sex: 'F', born: '1991-07-14', primary: 'Kowalski', payer: 'Gotham Mutual Health', visit: ['Kowalski', -1, '11:30', 'Annual physical', 'Annual exam'] },
  { first: 'Edward', last: 'Nygma', sex: 'M', born: '1983-02-28', primary: 'Hale', payer: 'Metropolis Care Alliance', notes: 'Answers intake questions with riddles.', visit: ['Lindqvist', 2, '15:30', 'New patient', 'Headaches'] },
  { first: 'Oswald', last: 'Cobblepot', sex: 'M', born: '1972-04-01', primary: 'Hale', payer: 'Gotham Mutual Health', medications: 'Metformin 500 mg twice daily', visit: ['Adeyemi', 7, '10:00', 'Follow-up', 'Knee pain and gait evaluation'] },
  { first: 'Jason', last: 'Todd', sex: 'M', born: '2001-08-16', primary: 'Wright', payer: 'Keystone Health Partners', emergency: ['Bruce Wayne', 'Parent', '555-0101'], visit: ['Grant', 0, '15:45', 'Sick visit', 'Cut on left hand'] },
  { first: 'Tim', last: 'Drake', sex: 'M', born: '2006-07-19', primary: 'Wright', payer: 'Wayne Enterprises Employee Health', notes: 'Reports sleeping 4 hours a night.', visit: ['Iyer', 3, '10:00', 'New patient', 'Sleep concerns'] },
  { first: 'Damian', last: 'Wayne', sex: 'M', born: '2015-09-10', address: '1007 Mountain Drive', primary: 'Varga', payer: 'Wayne Enterprises Employee Health', relation: 'parent', subscriber: 'Bruce Wayne', emergency: ['Bruce Wayne', 'Parent', '555-0101'], visit: ['Varga', 1, '09:00', 'Annual physical', 'Well-child visit'] },
  { first: 'Cassandra', last: 'Cain', sex: 'F', born: '2003-05-27', primary: 'Benton', payer: 'Wayne Enterprises Employee Health', preferred_language: 'English', visit: ['Nunez', 4, '14:30', 'Sick visit', 'Ankle sprain'] },
  { first: 'Kate', last: 'Kane', sex: 'F', born: '1993-12-07', primary: 'Delgado', payer: 'Keystone Health Partners', visit: ['Delgado', -2, '09:30', 'Annual physical', 'Annual physical'] },
  { first: 'Stephanie', last: 'Brown', sex: 'F', born: '2004-03-03', primary: 'Benton', payer: 'Medicaid', visit: ['Morgan', 0, '11:15', 'Sick visit', 'Sprained wrist'] },
  { first: 'Renee', last: 'Montoya', sex: 'F', born: '1984-08-30', primary: 'Okafor', payer: 'Gotham Mutual Health', visit: ['Okafor', 8, '11:00', 'Annual physical', 'Annual physical'] },
  { first: 'Harvey', last: 'Bullock', sex: 'M', born: '1966-11-19', primary: 'Whitfield', payer: 'Gotham Mutual Health', notes: 'High cholesterol; working on diet.', visit: ['Whitfield', 9, '13:00', 'Follow-up', 'Cholesterol review'] },
  { first: 'Jonathan', last: 'Crane', sex: 'M', born: '1976-10-31', primary: 'Hale', payer: 'Coast City Health Cooperative', notes: 'Asks staff what they are afraid of.', visit: ['Abrams', 5, '16:00', 'Follow-up', 'Medication management'] },
  { first: 'Talia', last: 'al Ghul', sex: 'F', born: '1985-03-21', primary: 'Moreau', payer: 'Metropolis Care Alliance', preferred_language: 'Arabic', visit: ['Moreau', 10, '10:30', 'Annual physical', 'Annual exam'] },
  { first: 'Clark', last: 'Kent', sex: 'M', born: '1986-06-18', city: 'Metropolis', state: 'NY', primary: 'Haddad', payer: 'Metropolis Care Alliance', notes: 'Vaccination attempts unsuccessful: needles bend.', visit: ['Haddad', 2, '10:30', 'Annual physical', 'Annual physical'] },
  { first: 'Lois', last: 'Lane', sex: 'F', born: '1987-04-02', city: 'Metropolis', state: 'NY', primary: 'Moreau', payer: 'Metropolis Care Alliance', visit: ['Moreau', 3, '09:00', 'Annual physical', 'Annual exam'] },
  { first: 'Diana', last: 'Prince', sex: 'F', born: '1981-03-22', city: 'Washington', state: 'DC', primary: 'Haddad', payer: 'Coast City Health Cooperative', notes: 'Reports being much older than her chart says.', visit: ['Nunez', 6, '13:30', 'Follow-up', 'Shoulder check after sports injury'] },
  { first: 'Barry', last: 'Allen', sex: 'M', born: '1992-03-14', city: 'Central City', state: 'MO', primary: 'Okafor', payer: 'Keystone Health Partners', notes: 'Very high metabolism; eats 8+ meals a day.', visit: ['Park', 1, '14:30', 'New patient', 'Weight loss and hunger'] },
  { first: 'Wally', last: 'West', sex: 'M', born: '2002-08-12', city: 'Central City', state: 'MO', primary: 'Wright', payer: 'Keystone Health Partners', visit: ['Ferreira', -1, '16:00', 'Sick visit', 'Ankle sprain'] },
  { first: 'Hal', last: 'Jordan', sex: 'M', born: '1984-02-20', city: 'Coast City', state: 'CA', primary: 'Fitzgerald', payer: 'Coast City Health Cooperative', notes: 'Test pilot; FAA medical exam due.', visit: ['Fitzgerald', 4, '08:30', 'Annual physical', 'Flight medical exam'] },
  { first: 'Arthur', last: 'Curry', sex: 'M', born: '1986-01-29', city: 'Amnesty Bay', state: 'ME', primary: 'Hale', payer: 'Coast City Health Cooperative', notes: 'Feels unwell when away from the ocean too long.', visit: ['Hale', 0, '14:30', 'Sick visit', 'Dehydration and dry skin'] },
  { first: 'Victor', last: 'Stone', sex: 'M', born: '1996-11-14', city: 'Detroit', state: 'MI', primary: 'Whitfield', payer: 'Medicare', notes: 'Extensive prosthetics; device checks with specialists.', visit: ['Adeyemi', 3, '11:30', 'Follow-up', 'Prosthetic fit follow-up'] },
  { first: 'Billy', last: 'Batson', sex: 'M', born: '2012-02-24', city: 'Fawcett City', state: 'PA', primary: 'Reyes', payer: 'Medicaid', relation: 'other', subscriber: 'Billy Batson', notes: 'Shouts a single word when nervous.', visit: ['Reyes', 2, '10:00', 'Sick visit', 'Sore throat'] },
  { first: 'Kara', last: 'Kent', sex: 'F', born: '2002-09-22', city: 'Metropolis', state: 'NY', primary: 'Benton', payer: 'Metropolis Care Alliance', visit: ['Benton', 5, '11:30', 'New patient', 'New patient visit'] },
  { first: 'Oliver', last: 'Queen', sex: 'M', born: '1985-05-16', city: 'Star City', state: 'CA', primary: 'Fitzgerald', payer: 'Keystone Health Partners', notes: 'Calluses on fingers from archery.', visit: ["O'Connell", 1, '15:00', 'Sick visit', 'Elbow pain'] },
  { first: 'Dinah', last: 'Lance', sex: 'F', born: '1989-03-11', city: 'Star City', state: 'CA', primary: 'Kowalski', payer: 'Keystone Health Partners', notes: 'Singer; throat check requested.', visit: ['Grant', 6, '09:15', 'Sick visit', 'Hoarse voice'] },
  { first: 'John', last: 'Constantine', sex: 'M', born: '1975-05-10', primary: 'Menon', payer: 'Coast City Health Cooperative', notes: 'Smoker; counseled on quitting.', visit: ['Carter', 7, '14:00', 'Follow-up', 'Chronic cough'] },
  { first: 'Zatanna', last: 'Zatara', sex: 'F', born: '1990-08-01', primary: 'Kowalski', payer: 'Metropolis Care Alliance', visit: ['Kowalski', 8, '10:00', 'Annual physical', 'Annual exam'] },
  { first: 'Garfield', last: 'Logan', sex: 'M', born: '2008-04-14', primary: 'Lombardi', payer: 'Gotham Mutual Health', relation: 'parent', subscriber: 'Rita Farr', notes: 'Vegetarian.', visit: ['Lombardi', 2, '15:00', 'Annual physical', 'Sports physical'] },
  { first: 'Rachel', last: 'Roth', sex: 'F', born: '2008-10-30', primary: 'Lombardi', payer: 'Gotham Mutual Health', relation: 'parent', subscriber: 'Arella Roth', visit: ['Iyer', 4, '13:00', 'New patient', 'Trouble sleeping'] },
  { first: 'Waylon', last: 'Jones', sex: 'M', born: '1980-07-07', primary: 'Hale', payer: 'Medicaid', notes: 'Skin condition followed by dermatology.', visit: ['Watanabe', 9, '14:00', 'Follow-up', 'Skin condition follow-up'] },
];

export const FIRST_NAMES = {
  F: ['Olivia', 'Emma', 'Ava', 'Sophia', 'Mia', 'Isabella', 'Amara', 'Grace', 'Chloe', 'Layla', 'Nora', 'Zoe', 'Elena', 'Maya', 'Aaliyah', 'Hana', 'Priya', 'Lucia', 'Camila', 'Valentina', 'Ruby', 'Ivy', 'Leah', 'Naomi', 'Sara', 'Fatima', 'Mei', 'Rosa', 'Tanya', 'Monique', 'Gloria', 'Diane', 'Patricia', 'Linda', 'Esther'],
  M: ['Liam', 'Noah', 'Elijah', 'James', 'Mateo', 'Lucas', 'Ethan', 'Aiden', 'Caleb', 'Isaac', 'Jayden', 'Omar', 'Hiro', 'Andre', 'Rafael', 'Kwame', 'Arjun', 'Diego', 'Malik', 'Samuel', 'Tyler', 'Connor', 'Victor', 'Felix', 'Jonah', 'Gabriel', 'Adrian', 'Marcus', 'Raymond', 'Walter', 'Frank', 'George', 'Harold', 'Dennis', 'Curtis'],
};
export const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Kim', 'Patel', 'Chen', 'Okoye', 'Novak', 'Rossi', 'Murphy', 'Cohen', 'Singh', 'Ali'];
export const STREETS = ['Park Row', 'Crime Alley', 'Kane Street', 'Robinson Park Ave', 'Burnley Road', 'Diamond District Blvd', 'Old Gotham Way', 'Otisburg Lane', 'Coventry Drive', 'Tricorner Street', 'Gotham Heights Ave', 'Amusement Mile', 'Chinatown Plaza', 'Little Italy Street', 'Riverside Drive'];
export const ALLERGIES = ['None known', 'None known', 'None known', 'Penicillin', 'Sulfa drugs', 'Peanuts', 'Latex', 'Shellfish', 'Codeine', 'Bee stings'];
export const LANGUAGES = ['English', 'English', 'English', 'English', 'English', 'Spanish', 'Spanish', 'Chinese', 'Haitian Creole', 'Arabic', 'Vietnamese', 'Portuguese'];

// Sample text documents attached to a few DC patients (all fictional)
export const SAMPLE_DOCUMENTS = [
  { patient: 'Wayne', first: 'Bruce', title: 'Chest X-ray report', category: 'Imaging', file: 'chest-xray-report.txt', daysAgo: 3,
    text: 'GOTHAM HOSPITAL - RADIOLOGY\nExam: Chest X-ray, 2 views\nIndication: Rib pain after "polo injury"\n\nFindings: Healing fractures of left ribs 6 and 7. Several older healed fractures noted.\nLungs clear. No pneumothorax.\n\nImpression: Healing rib fractures. Recommend rest (patient unlikely to comply).\n\nFictional demo document.' },
  { patient: 'Wayne', first: 'Bruce', title: 'Insurance card (front)', category: 'Insurance card', file: 'insurance-card.txt', daysAgo: 40,
    text: 'WAYNE ENTERPRISES EMPLOYEE HEALTH - PREMIER PPO\nMember: Bruce Wayne\nGroup: WE-0001\n\nFictional demo document.' },
  { patient: 'Pennyworth', first: 'Alfred', title: 'Lipid panel', category: 'Lab result', file: 'lipid-panel.txt', daysAgo: 12,
    text: 'GOTHAM HOSPITAL - LABORATORY\nPatient: Alfred Pennyworth\n\nTotal cholesterol  182 mg/dL\nLDL                98 mg/dL\nHDL                61 mg/dL\nTriglycerides     115 mg/dL\n\nAll values within reference range.\n\nFictional demo document.' },
  { patient: 'Dent', first: 'Harvey', title: 'Dermatology visit note', category: 'Visit note', file: 'dermatology-note.txt', daysAgo: 30,
    text: 'Dermatology follow-up: burn scars, left face and hand.\nGrafts healing well. Continue silicone sheets and sunscreen.\nPatient asked to flip a coin to decide on next appointment date.\n\nFictional demo document.' },
  { patient: 'Gordon', first: 'James', title: 'Referral to cardiology', category: 'Referral', file: 'cardiology-referral.txt', daysAgo: 8,
    text: 'Referral: James Gordon to Cardiology (Dr. Naomi Brandt)\nReason: Hypertension, occasional palpitations. High caffeine intake.\n\nFictional demo document.' },
];
