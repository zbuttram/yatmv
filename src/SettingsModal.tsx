import { Modal, ModalProps } from "./Modal";
import { Settings } from "./useSettings";
import { Dispatch, SetStateAction } from "react";

export function SettingsModal({
  isOpen,
  close,
  settings,
  setSettings,
}: ModalProps & {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
}) {
  return (
    <Modal isOpen={isOpen} close={close}>
      <h3 className="text-2xl font-semibold">Settings</h3>
      <div className="flex">
        <div>
          <div>Boost Mode</div>
          <div>When enabled, forces primary streams into highest quality.</div>
        </div>
        <RadioToggle
          id="boost-mode-toggle"
          state={settings.boostMode}
          update={(newState) =>
            setSettings((state) => ({ ...state, boostMode: newState }))
          }
        />
      </div>
    </Modal>
  );
}

function RadioToggle({
  state,
  id,
  update,
}: {
  state: boolean;
  id: string;
  update: (newState: boolean) => void;
}) {
  return (
    <div className="flex">
      <div className="mr-4">
        <input
          className="mr-1 cursor-pointer"
          type="radio"
          id={id + "-on"}
          checked={state}
          onChange={() => update(true)}
        />
        <label className="cursor-pointer" htmlFor={id + "-on"}>
          On
        </label>
      </div>
      <div>
        <input
          className="mr-1 cursor-pointer"
          type="radio"
          id={id + "-off"}
          checked={!state}
          onChange={() => update(false)}
        />
        <label className="cursor-pointer" htmlFor={id + "-off"}>
          Off
        </label>
      </div>
    </div>
  );
}
