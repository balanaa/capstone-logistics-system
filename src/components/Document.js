import React, { useState } from 'react';
import OverlayForm from './OverlayForm';
import './Document.css'

const Document = ({ type, data, style, proNo, setProDocumentList, proDocumentList }) => {
    const [showOverlay, setShowOverlay] = useState(false);

    const handleUpdate = (updatedData) => {
        const updatedList = proDocumentList.map(pro => {
            if (pro.proNo !== proNo) return pro;
            return {
                ...pro,
                documents: pro.documents.map(doc => {
                    if (doc.type !== type) return doc;
                    return {
                        ...doc,
                        data: doc.data.map(field => ({
                            ...field,
                            info: updatedData[field.label] ?? field.info
                        }))
                    };
                })
            };
        });

        setProDocumentList(updatedList);
        setShowOverlay(false);
    };

    return (
        <div className="document-container" style={{ backgroundColor: style.bgColor }}>
            <h3 className="document-name">{type}</h3>
            <div className="grid" style={{ columnCount: style.columns, columnWidth: style.columnWidth }}>
                {data.map((field, index) => (
                    <div key={index} className="info-block">
                        <div className="label">{field.label}:</div>
                        <div className="info">{field.info ?? '--'}</div>
                    </div>
                ))}
            </div>
            <button className="edit-button" onClick={() => setShowOverlay(true)}>Edit {type}</button>

            {showOverlay && (
                <OverlayForm
                    type={type}
                    data={data}
                    onClose={() => setShowOverlay(false)}
                    onSubmit={handleUpdate}
                />
            )}
        </div>
    );
};

export default Document;
