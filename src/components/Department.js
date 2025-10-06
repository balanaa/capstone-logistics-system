import React from 'react';
import { departmentDocuments, documentStyles } from '../data';
import Document from './Document';

const Department = ({ name, proNo, proDocumentList, setProDocumentList }) => {
    const documentTypes = departmentDocuments[name]; // Get document types for the selected department
    const proData = proDocumentList.find(pro => pro.proNo === proNo); // Find the selected PRO data

    if (!documentTypes || !proData) return <div>No data found for {name} / {proNo}</div>;

    return (
        <div className="department-documents" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {documentTypes.map((type) => {
                const documentItem = proData.documents.find(doc => doc.type === type);
                if (!documentItem) return null;

                const style = documentStyles.find(ds => ds.type === type) || {};
                return <Document
                        key={type}
                        type={type}
                        data={documentItem.data}
                        style={style}
                        proNo={proNo}
                        setProDocumentList={setProDocumentList}
                        proDocumentList={proDocumentList}
                    />
            })}
        </div>
    );
};

export default Department;
