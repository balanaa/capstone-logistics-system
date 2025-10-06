import React, { useEffect, useState } from 'react';
import './TableStyle.css';

const EquipmentInterchangeTable = () => {
  const [equipmentInterchangeData, setEquipmentInterchangeData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/equipmentinterchange')
      .then(res => res.json())
      .then(data => setEquipmentInterchangeData(data))
      .catch(err => console.error('Error fetching equipment interchange:', err));
  }, []);

  return (
    <div>
      <h2>Equipment Interchange</h2>
      <table>
        <thead>
          <tr>
            <th>Interchange ID</th>
            <th>Date Withdrawal</th>
            <th>Condition Before Exit</th>
            <th>Date Returned</th>
            <th>Condition Returned</th>
            <th>Complete</th>
          </tr>
        </thead>
        <tbody>
          {equipmentInterchangeData.map((row, index) => (
            <tr key={index}>
              <td>{row.interchangeid}</td>
              <td>{row.datewithdrawal}</td>
              <td>{row.conditionbeforeexit}</td>
              <td>{row.datereturned}</td>
              <td>{row.conditionreturned}</td>
              <td>{row.complete ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EquipmentInterchangeTable;