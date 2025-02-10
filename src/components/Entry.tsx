import React, { useState } from "react";
import { getCurrentTabUrl, getModifiedUrl } from "../utils/helper";
import { User } from "../types/User";
import { LOGOUT_URL, STORAGE_KEY } from "../utils/constants";
import { SettingsType } from "../types/SettingsType";

function Entry({
    settings,
    entry,
    onDelete,
    onEdit,
    onDragStart,
    onDragEnd,
    onDrop,
    isDragged,
    isDropTarget,
    onDragOver,
}: {
        settings: SettingsType;
        entry: User;
        onDelete: (entry: User, withConfirmation: boolean) => void;
        onEdit: (entry: User) => void;
        onDragStart: (event: React.DragEvent<HTMLDivElement>, entryId: string) => void;
        onDragEnd: () => void;
        onDrop: (event: React.DragEvent<HTMLDivElement>, entryId: string) => void;
        isDragged: boolean;
        isDropTarget: boolean;
        onDragOver: (event: React.DragEvent<HTMLDivElement>, entryId: string) => void;
    }) {
    const [showTooltip, setShowTooltip] = useState(false);

    const handleDelete = () => {
        onDelete(entry, true);
    };
    const handleEdit = () => {
        onEdit(entry);
    };

    const openInNewTab = async () => {
        const currentURL = await getCurrentTabUrl();
        const modifiedUrl = getModifiedUrl(currentURL);
        const target = encodeURIComponent(currentURL.split(".com")[1]);
        const properties = {
            active: true,
            url: `${modifiedUrl}/servlet/servlet.su?oid=${entry.OrgId}&suorgadminid=${entry.Id}&targetURL=${target}&retURL=${target}`,
        };

        if (settings?.UseReLoginFeature === false || settings?.UseReLoginFeature === undefined) {
            browser.tabs.create(properties);
        } else {
            let activeTab: browser.tabs.Tab | undefined;
            browser.tabs.query({ active: true, currentWindow: true })
                .then((tabs) => {
                    activeTab = tabs[0];

                    return browser.tabs.sendMessage(activeTab.id, { message: "Is User Logged In?" });
                })
                .then((response) => {
                    const isUserLoggedIn = response?.isLoggedIn;

                    if (!isUserLoggedIn) {
                        return browser.tabs.create(properties);
                    }

                    // Logout current user
                    const logoutUrl = `${modifiedUrl}/${LOGOUT_URL}`;
                    return browser.tabs.sendMessage(activeTab.id, { message: "logoutUser", logoutUrl });
                })
                .then((response) => {
                    if (response?.response !== "OK") return;

                    return browser.storage.local.get(STORAGE_KEY);
                })
                .then((result) => {
                    if (!result) return;

                    const res = result[STORAGE_KEY] || {};
                    res.loginURLs = res.loginURLs || [];

                    if (!res.loginURLs.includes(properties.url)) {
                        res.loginURLs.push(properties.url);
                    }

                    return browser.storage.local.set({ [STORAGE_KEY]: res });
                })
                .catch((error) => {
                    console.error("Error in login flow:", error);
                });
        }

    };


    const openUserRecord = async (event: React.MouseEvent) => {
        event.stopPropagation(); // Prevents the drag event from interfering
        const currentURL = await getCurrentTabUrl();
        const modifiedUrl = getModifiedUrl(currentURL);

        const userRecordUrl = `${modifiedUrl}/lightning/r/User/${entry.Id}/view`;

        browser.tabs.create({ url: userRecordUrl });
    };


    const ToolTippContainer = ({ entry }: { entry: User }) => (
        <div className="info-container">
            <div>
                <strong>First Name:</strong> {entry.FirstName}
            </div>
            <div>
                <strong>Last Name:</strong> {entry.LastName}
            </div>
            <div>
                <strong>Email:</strong> {entry.Email}
            </div>
            <div>
                <strong>Profile:</strong> {entry.Profile?.Name}
            </div>
            <div>
                <div>
                    <strong>Username:</strong> {entry.Username}
                </div>
                <strong>Org:</strong> {entry.OrgId}
            </div>
            <div>
                <strong>Id:</strong> {entry.Id}
            </div>
        </div>
    );

    return (
        <>
            {isDropTarget && <div className="drop-indicator"></div>} {/* Drop indicator */}
            <div className={`grid entry ${isDragged ? "dragging" : ""} ${isDropTarget ? "drop-target" : ""}`}
                draggable="true"
                // @ts-ignore
                onDragStart={(event) => onDragStart(event, entry.Id)}
                // @ts-ignore
                onDrop={(event) => onDrop(event, entry.Id)}
                // @ts-ignore
                onDragOver={(event) => onDragOver(event, entry.Id)} // ✅ Ensure drag-over is tracked
            >
                <div className="labelUsernameContainer">
                    <div className="labelEntry">
                        {entry.Label}
                        {settings?.ShowProfileNameInLabel === true ? (
                            <span className="profileName">({entry.Profile?.Name})</span>
                        ) : (
                                ""
                            )}
                    </div>

                    <div className="usernameEntry">
                        <div>{entry.Username}</div>
                        <div className="usernameEntryIcons">
                            {settings?.ShowUserLink === true && (
                                <div className="entry__userLink__icon" onClick={(e) => openUserRecord(e)} title="Open User Record"> 
                                </div>
                            )}
                            {settings?.ShowTooltip === true && (

                                <div className="tooltip">
                                    <i
                                        onMouseEnter={() => setShowTooltip(true)}
                                        onMouseLeave={() => setShowTooltip(false)}
                                        className="fa fa-info-circle information"
                                        aria-hidden="true"
                                    ></i>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {settings?.ShowTooltip === true && showTooltip && <ToolTippContainer entry={entry} />}
                <div className="buttons">
                    <button title="Open" className="grid-btn" onClick={openInNewTab}>
                        <i className="fa fa-home fa-sm"></i>
                    </button>
                    <button title="Edit" className="grid-btn" onClick={handleEdit}>
                        <i className="fa fa-pencil"></i>
                    </button>
                    <button title="Delete" className="grid-btn" onClick={handleDelete}>
                        <i className="fa fa-trash fa-2xs"></i>
                    </button>
                </div>
            </div>
        </>
    );
}

export default Entry;
