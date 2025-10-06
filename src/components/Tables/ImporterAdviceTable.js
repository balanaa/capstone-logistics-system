import React, { useEffect, useState } from 'react';
import './TableStyle.css';

const ImporterAdviceTable = () => {
  const [importerAdviceData, setImporterAdviceData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/importeradvice')
      .then(res => res.json())
      .then(data => setImporterAdviceData(data))
      .catch(err => console.error('Error fetching importer advice:', err));
  }, []);

  return (
    <div>
      <h2>Importer Advice</h2>
      <table>
        <thead>
          <tr>
            <th>Advice ID</th>
            <th>Warehouse Address</th>
            <th>Preferred Delivery Date</th>
            <th>Other Requirements</th>
            <th>Complete</th>
          </tr>
        </thead>
        <tbody>
          {importerAdviceData.map((row, index) => (
            <tr key={index}>
              <td>{row.adviceid}</td>
              <td>{row.warehouseaddress}</td>
              <td>{row.preferreddeliverydate}</td>
              <td>{row.otherrequirements}</td>
              <td>{row.complete ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ImporterAdviceTable;