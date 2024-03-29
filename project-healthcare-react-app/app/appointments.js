import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore'; // Ensure you import `doc`
import { db } from '../firebaseConfig';
import BottomNavBar from '../components/BottomNavBar';

const AppointmentsPage = () => {
  const [selectedTab, setSelectedTab] = useState('Upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const fetchAppointments = async () => {
      const querySnapshot = await getDocs(collection(db, "appointments"));
      const appointmentsPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        const patientRef = doc(db, "patients", data.patient);
        const patientSnapshot = await getDoc(patientRef);
        const patientData = patientSnapshot.data();
        const appointmentDate = data.date?.toDate()?.toDateString() || 'N/A'; // Convert the 'date' Timestamp

        return {
          id: docSnapshot.id,
          ...data,
          patientName: patientData?.name, // Use optional chaining in case data is undefined
          dob: patientData?.dob, 
          time: data.time || 'N/A', // Use the 'time' string directly
          date: appointmentDate
        };
      });

      const fetchedAppointments = await Promise.all(appointmentsPromises);
      setAppointments(fetchedAppointments.sort((a, b) => new Date(a.date) - new Date(b.date)));
    };

    fetchAppointments();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Appointments</Text>
        <TextInput
          placeholder="Search by name"
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.tabs}>
        <Button title="Upcoming" onPress={() => setSelectedTab('Upcoming')} color={selectedTab === 'Upcoming' ? 'blue' : 'grey'} />
        <Button title="Missed" onPress={() => setSelectedTab('Missed')} color={selectedTab === 'Missed' ? 'blue' : 'grey'} />
        <Button title="Completed" onPress={() => setSelectedTab('Completed')} color={selectedTab === 'Completed' ? 'blue' : 'grey'} />
      </View>

      <ScrollView style={styles.appointmentsList}>
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            // TODO: add navigation to appointment details scren
            <TouchableOpacity key={appointment.id} onPress={() => navigateToPatientPage(appointment.id)}>
              <View style={styles.appointmentItem}>
                <View style={styles.appointmentItemRow}>
                  <Image source={require('../assets/favicon.png')} style={styles.icon} />
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentTitle}>{appointment.patientName || "No Name"}</Text>
                    <Text style={styles.appointmentText}>DOB: {appointment.dob}</Text>
                    <Text style={styles.appointmentText}>Time: {appointment.time}</Text>
                    <Text style={styles.appointmentText}>Date: {appointment.date}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text>No appointments found.</Text>
        )}
      </ScrollView>
      <BottomNavBar />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  appointmentsList: {
    flex: 1,
  },
  appointmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 30, // Set the size of your icon
    height: 30, // Set the size of your icon
    marginRight: 10, // Add some space between the icon and the text
  },
  appointmentDetails: {
    flex: 1, // Allow the details to fill the remaining space
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AppointmentsPage;
