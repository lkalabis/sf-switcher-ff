import React, { useEffect, useState } from "react";
import Entry from "./components/Entry";
import Footer from "./components/Footer";
import EntryForm from "./components/EntryForm";
import {
    getCurrentTabUrl,
    getModifiedUrl,
    toastConfig,
    writeNewEntryToStorage,
    writeAllEntriesToStorage,
} from "./utils/helper";
// @ts-ignore
import { sfConn } from "./utils/inspector";
import { User } from "./types/User";
import { SettingsType } from "./types/SettingsType";
import { OrgInfo } from "./types/OrgInfo";
import { LOADING_MESSAGE, STORAGE_KEY } from "./utils/constants";
import { ToastContainer, ToastOptions, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Settings from "./components/Settings";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export default function App() {
    const [showAddEntryForm, setShowAddEntryForm] = useState(false);
    const [showEditEntryForm, setShowEditEntryForm] = useState(true);
    const [showAddButtonContainer, setShowAddButtonContainer] = useState(true);
    const [showEditButtonContainer, setShowEditButtonContainer] = useState(false);
    const [editUsername, setEditUsername] = useState("");
    const [editLabel, setEditLabel] = useState("");
    const [editRecord, setEditRecord] = useState<User>();
    const [currentOrg, setCurrentOrg] = useState<OrgInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isValidURL, setisValidURL] = useState(true);
    const [entries, setEntries] = useState<User[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<SettingsType>({
        ShowProfileNameInLabel: false,
        ShowTooltip: true,
        UseReLoginFeature: true,
        MillisecondsToWaitTillRelogin: 1000,
    });

    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    async function fetchData() {
        try {
            const currentURL = await getCurrentTabUrl();
            const modifiedUrl = getModifiedUrl(currentURL);
            const currentOrgInfo = await sfConn.getSession(modifiedUrl);
            setCurrentOrg(currentOrgInfo);

            const result = await browser.storage.local.get(STORAGE_KEY);
            const storedEntries = result[STORAGE_KEY] || {};
            setSettings(result[STORAGE_KEY].settings || {});

            const transformedEntries = transformEntries(currentOrgInfo, storedEntries);
            if (transformedEntries.length === 0) {
                addEntry();
            } else {
                setEntries(transformedEntries);
            }

            setLoading(false);
        } catch (error) {
            setLoading(false);
            setisValidURL(false);
            setShowAddButtonContainer(false);
            setShowEditButtonContainer(false);
        }
    }

    // @ts-ignore
    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    // @ts-ignore
    const handleDragEnd = async (event) => {
        setActiveId(null);
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = entries.findIndex((entry) => {
                return entry.Id === active.id;
            });
            const newIndex = entries.findIndex((entry) => {
                return entry.Id === over.id;
            });

            const a = arrayMove(entries, oldIndex, newIndex);
            setEntries(a);

            if (currentOrg) {
                await writeAllEntriesToStorage(a, currentOrg);
                await fetchData();
            }
        }
    };

    const transformEntries = (currentOrgInfo: OrgInfo | null, storedEntries: Record<string, any>): User[] => {
        return (
            // @ts-ignore
            storedEntries[currentOrgInfo?.orgId]?.users.map((user: User) => ({
                Email: user.Email,
                FirstName: user.FirstName,
                LastName: user.LastName,
                Id: user.Id,
                Label: user.Label,
                OrgId: user.OrgId,
                Username: user.Username,
                UUID: user.UUID,
                Profile: {
                    Name: user.Profile?.Name,
                },
            })) || []
        );
    };

    useEffect(() => {
        fetchData();
    }, []);

    const addEntry = () => {
        setShowEditButtonContainer(false);
        setShowEditEntryForm(false);
        setShowAddEntryForm((prevShowAddEntryForm) => !prevShowAddEntryForm);
    };

    const editEntry = (entryToEdit: User) => {
        const index = entries?.findIndex((entry: User) => entry.UUID === entryToEdit.UUID);
        if (index !== undefined && index > -1 && entries) {
            setEditUsername(entries[index].Username);
            setEditLabel(entries[index].Label);
            setEditRecord(entries[index]);
        }

        setShowAddButtonContainer(false);
        setShowAddEntryForm(false);
        setShowEditEntryForm(true);
        setShowEditButtonContainer(true);
    };

    const cancelAddEntry = () => {
        setShowAddEntryForm(false);
    };

    const cancelEditEntry = () => {
        setShowEditEntryForm(false);
        setShowEditButtonContainer(false);
        setShowAddButtonContainer(true);
    };

    const saveNewEntry = async (newEntry: User) => {
        if (!newEntry.Id) {
            return toast.error("This is not a valid User", {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
        }
        if (newEntry.Label) {
            newEntry.Label = newEntry.Label.trim();
        }
        newEntry.Username = newEntry.Username.trim();
        setShowEditEntryForm(false);
        setShowEditButtonContainer(false);
        setShowAddButtonContainer(true);
        setShowAddEntryForm(false);
        if (currentOrg) {
            await writeNewEntryToStorage(newEntry, currentOrg);
            await fetchData();
            toast.success("Entry Saved", toastConfig as ToastOptions<unknown>);
        }
    };

    const updateExistingEntry = async (updateEntry: User) => {
        try {
            if (editRecord) {
                await deleteEntry(editRecord, false);
            }
            if (updateEntry.Label) {
                updateEntry.Label = updateEntry.Label.trim();
            }
            updateEntry.Username = updateEntry.Username.trim();
            setShowEditEntryForm(false);
            setShowEditButtonContainer(false);
            setShowAddButtonContainer(true);
            setShowAddEntryForm(false);
            if (currentOrg) {
                await writeNewEntryToStorage(updateEntry, currentOrg);
                toast.success("Entry Changed", toastConfig as ToastOptions<unknown>);
                await loadRecords();
            }
        } catch (error) {
            console.error("Error deleting entry:", error);
        }
    };

    const loadRecords = async () => {
        // Update state to remove the entry
        const result = await browser.storage.local.get(STORAGE_KEY);
        const storedEntries = result[STORAGE_KEY] || {};

        const transformedEntries = transformEntries(currentOrg, storedEntries);
        setEntries(transformedEntries);
        if (transformedEntries.length === 0) {
            addEntry();
        } else {
            setEntries(transformedEntries);
        }
    };

    const deleteExistingEntry = async (editRecord: User, withConfirmation: boolean) => {
        try {
            await deleteEntry(editRecord, withConfirmation);
            toast.info("Entry Deleted", toastConfig as ToastOptions<unknown>);
            await loadRecords();
        } catch (error) {
            console.error(error);
        }
    };

    const deleteEntry = (entryToDelete: User, withConfirmation: boolean): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            if (withConfirmation) {
                const isConfirmed = window.confirm("Are you sure you want to delete this entry?");
                if (!isConfirmed) {
                    reject(new Error("Deletion canceled by user"));
                    return;
                }
            }

            // Retrieve the existing data from storage
            browser.storage.local
                .get(STORAGE_KEY)
                .then((result) => {
                    if (browser.runtime.lastError) {
                        console.error("Error:", browser.runtime.lastError);
                        reject(new Error(browser.runtime.lastError.message));
                        return;
                    }

                    const storageData = result[STORAGE_KEY] || {};

                    // Delete the entry with the matching ID
                    const validUsers = storageData[currentOrg?.orgId].users.filter(
                        (user: User) => user.UUID !== entryToDelete.UUID,
                    );
                    storageData[currentOrg?.orgId].users = validUsers;

                    return browser.storage.local.set({ [STORAGE_KEY]: storageData });
                })
                .then(() => {
                    if (browser.runtime.lastError) {
                        console.error("Error:", browser.runtime.lastError);
                        reject(new Error(browser.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                })
                .catch((error) => {
                    reject(error); // Forward any errors from browser.storage.local.get or browser.storage.local.set
                });
        });
    };

    const toggleView = () => {
        setShowSettings((prevShowAddEntryForm) => !prevShowAddEntryForm);
    };

    const renderAddEntryForm = () => {
        return (
            <>
                <div className="addButtonContainer">
                    {!showAddEntryForm && (
                        <button title="Add Entry" className="btn addEntryButton" onClick={addEntry}>
                            <i className="fa fa-plus"></i>
                        </button>
                    )}
                    {showAddEntryForm && (
                        <EntryForm
                            isNewEntry={true}
                            currentOrg={currentOrg!}
                            onSaveNew={saveNewEntry}
                            onCancelAdd={cancelAddEntry}
                            onCancelEdit={cancelEditEntry}
                            username={""}
                            label={""}
                            // @ts-ignore
                            record={""}
                            onSaveExisting={function (entry: User): void {
                                throw new Error("Function not implemented.");
                            }}
                        />
                    )}
                </div>
            </>
        );
    };

    const renderEditEntryForm = () => {
        return (
            <div className="editButtonContainer">
                {showEditEntryForm && (
                    <EntryForm
                        isNewEntry={false}
                        username={editUsername}
                        record={editRecord!}
                        label={editLabel}
                        onSaveExisting={updateExistingEntry}
                        onCancelAdd={cancelAddEntry}
                        onCancelEdit={cancelEditEntry}
                        currentOrg={currentOrg!}
                        onSaveNew={function (entry: User): void {
                            throw new Error("Function not implemented.");
                        }}
                    />
                )}
            </div>
        );
    };
    return (
        // @ts-ignore
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="container">
                {showSettings ? (
                    // Render what you want to show when showSettings is true
                    <Settings settings={settings} onSetSettings={setSettings} />
                ) : (
                    <>
                        <ToastContainer
                            position="top-right"
                            autoClose={false}
                            newestOnTop={false}
                            closeOnClick
                            rtl={false}
                            pauseOnFocusLoss
                            draggable
                            theme="dark"
                        />
                        {showAddButtonContainer && renderAddEntryForm()}
                        {showEditButtonContainer && renderEditEntryForm()}

                        <div className="gridContainer">
                            {!isValidURL ? (
                                <div className="invalidURLMessage">
                                    <h3>Invalid URL</h3>
                                    <p>
                                        This extension only works on Salesforce domains. Please navigate to a valid
                                        Salesforce domain.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {loading ? (
                                        LOADING_MESSAGE
                                    ) : (
                                        <>
                                            <SortableContext items={entries}>
                                                {entries?.map((entry) => (
                                                    <Entry
                                                        settings={settings}
                                                        key={entry.Id}
                                                        entry={entry}
                                                        onDelete={deleteExistingEntry}
                                                        onEdit={editEntry}
                                                    />
                                                ))}
                                                <DragOverlay>
                                                    <div
                                                        style={{
                                                            position: "fixed",
                                                            top: 0,
                                                            left: 0,
                                                            width: "100%",
                                                            height: "100%",
                                                            background: "rgba(0, 0, 0, 0.5)", // Semi-transparent black background
                                                            zIndex: 1000, // Ensure it's above other elements
                                                        }}
                                                    ></div>
                                                </DragOverlay>
                                            </SortableContext>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
                <Footer doShowSettings={showSettings} onShowSetings={toggleView} />
            </div>
        </DndContext>
    );
}
