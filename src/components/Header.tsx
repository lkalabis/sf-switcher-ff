import React from "react";

export default function Header({ loading, currentOrg }) {
    return (
        <>
            <div className="header">
                {loading ? (
                    // Display a loading indicator or some message while data is being fetched
                    <p>Loading...</p>
                ) : (
                    // Render your component content using currentOrg
                    <p>
                        {currentOrg.orgId} {currentOrg.hostname}
                    </p>
                )}
            </div>
        </>
    );
}
