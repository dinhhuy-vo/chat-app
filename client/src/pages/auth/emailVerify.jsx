import { Input } from "@/components/ui/input";
import { useState } from "react";
import ReactSvg from "@/assets/react.svg";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { VERIFY_EMAIL } from "@/utils/constants";

export default function VerifyEmail() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleVerify = async () => {
    try {
      const response = await apiClient.post(
        VERIFY_EMAIL,
        { code },
        { withCredentials: true }
      );

      toast.success(response.data.message);
      navigate("/profile");
    } catch (error) {
      toast.warning(error.response?.data?.message || "Verification failed");
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden">
      <div className="w-3/4 h-[80%] bg-white drop-shadow-xl">
        <div className="h-full flex items-center justify-center gap-10">
          <div className="d-flex flex-col md:flex-row">
            <h1 className="text-2xl">Hi, final step to continue application</h1>
            <p className="mb-4">
              We have sent an email containing a verification code, please enter
              the code here!
            </p>
            <div className="flex flex-col gap-4">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                type="text"
                placeholder="Code"
              />
              <Button onClick={handleVerify}>Verify</Button>
            </div>
          </div>
          <div className="hidden lg:flex">
            <img
              src={ReactSvg}
              className="h-[150px] duration-5000 animate-[spin_20s_linear_infinite]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
