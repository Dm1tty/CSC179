import React, { useState, useEffect } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { db } from '../firebaseConfig';
import { getDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Alert } from "react-native";


const windowWidth = Dimensions.get("window").width;

const AppointmentDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { appointmentId } = route.params ?? {};  // Provides an empty object as fallback
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [illnesses, setIllnesses] = useState([]);
  const [patientId, setPatientId] = useState(null);
  const [isPickerShow, setIsPickerShow] = useState(false);

  const [newDateTime, setNewDateTime] = useState(new Date());

  console.log("Route params received:", route.params);


  useEffect(() => {
    const fetchAppointmentAndPatient = async () => {
      setLoading(true);
      try {
        const appointmentRef = doc(db, 'appointments', appointmentId);
        const appointmentSnap = await getDoc(appointmentRef);

        if (appointmentSnap.exists()) {
          const appData = appointmentSnap.data();
          appData.date = appData.date ? appData.date.toDate().toDateString() : 'N/A';
          setAppointment(appData);

          const patientRef = doc(db, 'patients', appData.patient);
          const patientSnap = await getDoc(patientRef);

          if (patientSnap.exists()) {
            const patientData = patientSnap.data();
            setPatient(patientData);
            setPatientId(patientSnap.id);  // Set the patient's ID
            console.log("patientID:" + patientId)
            // Check for illnesses and set them
            if (patientData.illnesses && patientData.illnesses.length > 0) {
              setIllnesses(patientData.illnesses);
              console.log("Illnesses:", patientData.illnesses);
            } else {
              setIllnesses([]);
              console.log("No illnesses listed in the patient document.");
            }
          } else {
            console.log('No such patient!');
            setPatient(null);
            setIllnesses([]);
            setPatientId(null);  // Ensure to clear ID if no patient is found
          }
        } else {
          console.log('No such appointment!');
          setAppointment(null);
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentAndPatient();
  }, [appointmentId, patientId]);


  // Handler to simply set the date without hiding the picker
  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || newDateTime;
    setNewDateTime(currentDate);  // Update the full date and time
  };

  // Add a function to hide the picker and confirm the rescheduling
  const confirmRescheduling = () => {
    updateAppointment();  // Call the function to update Firestore
    setIsPickerShow(false);  // Now hide the picker
  };

  const handleAppointmentCompletion = () => {
    navigation.navigate('visit_summary', {
      patientData: patient,  // 'patient' holds your patient data,
      patientId: patientId,
      appointmentId: appointmentId  //  'appointmentId' is the ID of the appointment
    });
  };

  const handleAppointmentCancellation = () => {
    Alert.alert(
      "Confirm Cancellation",
      "Are you sure you want to cancel this appointment?",
      [
        {
          text: "Go Back",
          onPress: () => console.log("Cancellation aborted"),
          style: "cancel"
        },
        {
          text: "Confirm",
          onPress: () => {
            console.log("Confirmed cancellation");

            navigation.reset({
              index: 0,
              routes: [{ name: 'index' }],
            });
            cancelAppointment();
          }
        }
      ]
    );
  };

  const cancelAppointment = async () => {
    const appointmentRef = doc(db, 'appointments', appointmentId);

    try {
      await updateDoc(appointmentRef, {
        status: "Cancelled"
      });
      console.log('Appointment successfully cancelled.');

      // Optionally, navigate back or refresh the data here
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }
  const illnessNames = illnesses.map(illness => illness.name).join(', ');
  console.log("ilnesses: " + illnessNames);

  function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  const formatTimeForFirestore = (newDateTime) => {
    return `${newDateTime.getHours().toString().padStart(2, '0')}:${newDateTime.getMinutes().toString().padStart(2, '0')}`;
  };

  const age = calculateAge(patient.dateOfBirth);


  const updateAppointment = async () => {

    console.log('newDateTime:', newDateTime);
    console.log('Timestamp:', Timestamp.fromDate(newDateTime));
    console.log('Formatted Time:', formatTimeForFirestore(newDateTime));
    const appointmentRef = doc(db, 'appointments', appointmentId);
    try {
      await updateDoc(appointmentRef, {
        date: Timestamp.fromDate(newDateTime), // Convert the entire newDateTime to a Firestore timestamp
        time: formatTimeForFirestore(newDateTime),
        status: 'Upcoming'
      });

      console.log('Appointment rescheduled successfully');
      Alert.alert(
        "Appointment Rescheduled",
        "Your appointment has been rescheduled successfully.",
        [
          {
            text: "Okay",
            onPress: () => {
              console.log('Pressed OK');
              // navigation reset or other navigation code here
              navigation.reset({
                index: 0,
                routes: [{ name: 'index' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };


  return (
    <View>
      <View style={styles.container}>
        <Image
          source={patient?.image ? { uri: patient.image } : require('../assets/icon.png')}
          style={styles.circularImageView}
        />

        <View style={styles.content}>
          <Text style={styles.name}>{patient.firstName} {patient.lastName}</Text>
          <Text style={styles.age}>Age: {age}</Text>
        </View>
      </View>
      <View style={styles.detailesConatainer}>
        <Text style={styles.dateTimeText}>{appointment.date} {appointment.time}</Text>
        <View style={styles.itemContainer}>
          {/* Horizontal items */}
          <TouchableOpacity onPress={handleAppointmentCompletion}>
            <View style={styles.item}>
              {/* Icon image */}
              <Image
                source={require('../assets/mark-icon.png')}
                style={styles.icon}
              />
              {/* Text */}
              <Text style={styles.itemText}>Mark As{"\n"}Completed</Text>
            </View>
          </TouchableOpacity>


          <TouchableOpacity onPress={handleAppointmentCancellation}>
            <View style={styles.item}>
              {/* Icon image */}
              <Image
                source={require('../assets/delete-icon.png')}
                style={styles.icon}
              />
              {/* Text */}
              <Text style={styles.itemText}>Cancel{"\n"}Appointment</Text>
            </View>
          </TouchableOpacity>


          <TouchableOpacity onPress={() => setIsPickerShow(true)} style={styles.item}>
            <Image source={require('../assets/reschedule-icon.png')} style={styles.icon} />
            <Text style={styles.itemText}>Reschedule{"\n"}Appointment</Text>
          </TouchableOpacity>



        </View>
      </View>

      <View style={styles.patientDetaileContainer}>
        <Text style={styles.tagContainer}>Patient Details </Text>
        <View style={styles.keyValueContainer}>
          <Text style={styles.key}>Full Name</Text>
          <Text style={styles.value}>{patient.firstName} {patient.lastName}</Text>
        </View>
        <View style={styles.keyValueContainer}>
          <Text style={styles.key}>DOB:</Text>
          <Text style={styles.value}>{patient.dateOfBirth}</Text>
        </View>
        <View style={styles.keyValueContainer}>
          <Text style={styles.key}>Gender</Text>
          <Text style={styles.value}>{patient.gender}</Text>
        </View>
        <View style={styles.keyValueContainer}>
          <Text style={styles.key}>Phone NO:</Text>
          <Text style={styles.value}>{patient.mobilePhone}</Text>
        </View>
        <View style={styles.keyValueContainer}>
          <Text style={styles.key}>Medical History</Text>
          <Text style={styles.value}>{illnessNames}</Text>
        </View>

        <Text style={styles.tagContainer}>Details</Text>
        <View style={styles.keyValueContainer}>
          <Text style={styles.key}>Reason</Text>
          <Text style={styles.value}>{appointment.reason}</Text>
        </View>

      </View>
      {isPickerShow && (
        <>
          <Text style={styles.tagContainer}>Reschedule</Text>
          <DateTimePicker
            value={newDateTime}
            mode="datetime"
            is24Hour={true}
            display="default"
            onChange={handleDateChange}
          />
          <TouchableOpacity onPress={confirmRescheduling} style={styles.button}>
            <Text style={styles.buttonText}>Confirm Reschedule</Text>
          </TouchableOpacity>
        </>
      )}



    </View>
  );
};

const styles = StyleSheet.create({
  keyValueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Optional: for better visibility in debugging
  },
  key: {
    fontSize: 14,
    color: '#888888'
    // Add any other styles as needed
  },
  value: {
    fontSize: 12,
    color: '#666666'
    // Add any other styles as needed
  },
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "#1EB6B9", // Background color for toolbar
    paddingVertical: 10,
    width: windowWidth, // Set width to the width of the device screen
  },
  content: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
    alignItems: "start",
  },
  backButton: {
    marginLeft: 20,
  },
  circularImageView: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    marginBottom: 10,
    marginLeft: 30,
  },
  name: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    color: "white",
  },
  age: {
    fontSize: 12,
    color: "white",
  },
  detailesConatainer: {
    backgroundColor: "#E3FEFF",
  },
  dateTimeText: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 20,
    color: "#09ABAE",
  },
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  item: {
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "white",
  },

  icon: {
    width: 30,
    height: 30,
    marginBottom: 5,
  },
  itemText: {
    fontSize: 12,
    textAlign: "center",
  },
  tagContainer: {
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "#F2F2F2",
    padding: 10,
    fontWeight: "bold",
    color: '#666666',
    marginTop: 10,
  },
  patientDetaileContainer: {
    marginHorizontal: 10,
  },
  button: {
    backgroundColor: '#1EB6B9',
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 10,
    marginTop: 20,
    marginHorizontal: 20

  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  document: {
    width: 100,
    height: 100,
    marginBottom: 5,
  },
});

export default AppointmentDetailScreen;