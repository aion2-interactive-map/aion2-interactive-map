import React, {useState, useEffect} from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Autocomplete,
  AutocompleteItem
} from "@heroui/react";
import {useDebounce} from "@/hooks/useDebounce";

interface UserSearchItem {
  id: string;
  email: string;
  isActive: boolean;
  isSuperuser: boolean;
  isVerified: boolean;
  name: string;
}

interface ArtifactAdminModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAdmin: (userId: string) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  t: any;
}

const ArtifactAdminModal: React.FC<ArtifactAdminModalProps> = ({
  isOpen,
  onOpenChange,
  onAddAdmin,
  fetchWithAuth,
  t
}) => {
  const [newAdminUserId, setNewAdminUserId] = useState("");
  const [userSearchKeyword, setUserSearchKeyword] = useState("");
  const debouncedUserSearchKeyword = useDebounce(userSearchKeyword, 500);
  const [userSearchResults, setUserSearchResults] = useState<UserSearchItem[]>([]);
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNewAdminUserId("");
      setUserSearchKeyword("");
      setUserSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchUsers = async () => {
      const keyword = debouncedUserSearchKeyword.trim();
      if (!keyword) {
        setUserSearchResults([]);
        return;
      }

      setIsUserSearchLoading(true);
      try {
        const res = await fetchWithAuth(`/users/search?name=${encodeURIComponent(keyword)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.errorCode === "Success") {
            setUserSearchResults(json.data.results);
          }
        }
      } catch (e) {
        console.error("Failed to search users", e);
      } finally {
        setIsUserSearchLoading(false);
      }
    };

    searchUsers();
  }, [debouncedUserSearchKeyword, fetchWithAuth]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent className="bg-character-card">
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {t("common:leaderboard.addArtifactAdmin")}
            </ModalHeader>
            <ModalBody>
              <Autocomplete
                autoFocus
                label={t("common:auth.username")}
                placeholder={t("common:ui.search")}
                variant="bordered"
                items={userSearchResults}
                isLoading={isUserSearchLoading}
                inputValue={userSearchKeyword}
                onInputChange={setUserSearchKeyword}
                onSelectionChange={(key) => setNewAdminUserId(String(key))}
              >
                {(item) => (
                  <AutocompleteItem key={item.id} textValue={item.name || item.email}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{item.name || "No Name"}</span>
                      <span className="text-xs text-default-800">{item.email}</span>
                    </div>
                  </AutocompleteItem>
                )}
              </Autocomplete>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="flat" onPress={onClose}>
                {t("common:ui.cancel")}
              </Button>
              <Button color="primary" onPress={() => onAddAdmin(newAdminUserId)}>
                {t("common:ui.add")}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default ArtifactAdminModal;
