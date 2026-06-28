import {useRef, useState} from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Input, Button, Alert
} from "@heroui/react";
import Altcha from "@/components/Altcha.tsx";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faEnvelope,
  faLock,
  faTriangleExclamation, faUser
} from "@fortawesome/free-solid-svg-icons";
import {useTranslation} from "react-i18next";
import {useUser} from "@/context/UserContext.tsx";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AuthModal({isOpen, onClose}: AuthModalProps) {
  // const [mode, setMode] = useState<"login" | "register">("login");
  const {
    login, register,
    userModalMode: mode, setUserModalMode: setMode,
  } = useUser();

  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [error, setError] = useState<string>("");
  const altchaRef = useRef<HTMLInputElement>(null);

  const {t} = useTranslation();

  const mismatch = mode === "register" && password && verifyPassword && password !== verifyPassword;


  const submitLogin = async () => {
    const res = await login(email, password);
    if (res) {
      onClose();
    } else {
      setError(t("common:auth.loginError", "Login error, please check email and password!"));
    }
  };

  const submitRegister = async () => {
    const altchaValue = altchaRef.current?.value;
    if (!altchaValue) {
      setError(t("common:auth.altcha", "Please complete human verification!"));
      return;
    }
    if (password !== verifyPassword) {
      setError(t("common:auth.passwordMismatch", "Your passwords are not identical!"));
      return;
    }
    if (!email || !password || !username) {
      setError(t("common:auth.registerMissing", "Missing field!"));
      return;
    }
    const res = await register(email, password, username, altchaValue);
    if (!res) {
      setError(t("common:auth.registerError", "Register error, please check email and password!"));
      return;
    }
    setMode("login");
    await submitLogin();
  };

  const inputClassNames = {
    inputWrapper: ` bg-input hover:!bg-input focus:!bg-input transition-none
                    group-data-[hover=true]:!bg-input
                    group-data-[focus=true]:!bg-input
                    group-data-[focus-visible=true]:!bg-input
                    group-data-[invalid=true]:!bg-input
                    
                  `,
    innerWrapper: `h-10 py-0`
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="center"
      size="md"
      classNames={{
        wrapper: "z-[30000]",
        backdrop: "z-[29999] bg-background/60 backdrop-blur-md",
        base: "z-[30001]",
      }}
      hideCloseButton={true}
    >
      <ModalContent className="bg-sidebar">
        {() => (
          <>
            <ModalHeader className="text-lg font-medium text-default-800 justify-center">
              {mode === "login" ? t("common:auth.loginTitle", "Login") : t("common:auth.registerTitle", "Register")}
            </ModalHeader>

            <ModalBody className="flex flex-col gap-3">
              {error.length > 0 &&
                <Alert
                  variant="flat" color="danger" radius="none"
                  className="text-sm"
                >
                  {error}
                </Alert>
              }
              {mode === "register" && (
                <Input
                  isRequired
                  placeholder={t("common:auth.username", "Username")}
                  radius="none"
                  type="text"
                  value={username}
                  onValueChange={setUsername}
                  classNames={inputClassNames}
                  startContent={
                    <FontAwesomeIcon icon={faUser} className="text-default-700 text-sm"/>
                  }
                />
              )}
              <Input
                isRequired
                placeholder={t("common:auth.email", "Email")}
                radius="none"
                type="email"
                value={email}
                onValueChange={setEmail}
                classNames={inputClassNames}
                startContent={
                  <FontAwesomeIcon icon={faEnvelope} className="text-default-700 text-sm"/>
                }
              />

              <Input
                isRequired
                placeholder={t("common:auth.password", "Password")}
                radius="none"
                type="password"
                value={password}
                onValueChange={setPassword}
                classNames={inputClassNames}
                startContent={
                  <FontAwesomeIcon icon={faLock} className="text-default-700 text-sm"/>
                }
              />

              {mode === "register" && (
                <>
                  <Input
                    isRequired
                    placeholder={t("common:auth.passwordVerify", "Confirm Password")}
                    radius="none"
                    type="password"
                    value={verifyPassword}
                    onValueChange={setVerifyPassword}
                    classNames={inputClassNames}
                    startContent={
                      <FontAwesomeIcon
                        icon={mismatch ? faTriangleExclamation : faCheckCircle}
                        className={mismatch ? "text-danger" : "text-default-700"}
                      />
                    }
                  />

                  <div
                    className="w-full h-[80px] bg-input flex items-center justify-center text-xs ">
                    <Altcha ref={altchaRef}/>
                  </div>
                </>
              )}
            </ModalBody>

            <ModalFooter className="flex flex-col items-center gap-3">
              {/*<Divider/>*/}

              {/* FULL WIDTH ACTION BUTTON */}
              <Button
                color="primary"
                onPress={mode === "login" ? submitLogin : submitRegister}
                fullWidth
                radius="none"
                className="h-[42px] text-[15px] font-medium text-background"
              >
                {mode === "login" ? t("common:auth.login", "Login") : t("common:auth.register", "Register")}
              </Button>

              {/* Switch auth mode */}
              <button
                className="text-xs text-primary hover:underline mt-1"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login"
                  ? t("common:auth.loginSwitch", "Don't have an account? Register")
                  : t("common:auth.registerSwitch", "Already have an account? Login")}
              </button>

            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
