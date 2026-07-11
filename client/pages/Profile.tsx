import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { uploadImageToS3 } from "@/lib/s3Upload";
import { EMPLOYEE_PROFILE_ROLES } from "../../shared/appConstants";

export default function Profile() {
  const { user, token, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    dob: "",
    gender: "",
    address: "",
    domain_expertise: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        contact: user.contact || "",
        dob: user.dob || "",
        gender: user.gender || "",
        address: user.address || "",
        domain_expertise: user.domain_expertise || "",
      });
    }
  }, [user]);

  const profileImageSrc = useMemo(() => {
    if (photoPreview) return photoPreview;
    if (!user?.profile_photo) return "";
    const version = user.profile_photo_updated_at
      ? new Date(user.profile_photo_updated_at).getTime()
      : 0;
    if (!version || Number.isNaN(version)) return user.profile_photo;
    const separator = user.profile_photo.includes("?") ? "&" : "?";
    return `${user.profile_photo}${separator}v=${version}`;
  }, [photoPreview, user?.profile_photo, user?.profile_photo_updated_at]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let photoUrl = "";

      // Upload photo to S3 if selected
      if (profilePhoto) {
        photoUrl = await uploadImageToS3({
          file: profilePhoto,
          token: token ?? "",
          purpose: "profile",
        });
      }

      // Update profile
      const updateData = {
        ...formData,
        ...(photoUrl && { profile_photo: photoUrl }),
      };

      const response = await fetch("/api/employees/profile", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const responseBody = await response.json().catch(() => ({} as any));

      if (response.ok) {
        if (responseBody?.profile) {
          updateProfile(responseBody.profile);
        } else {
          updateProfile({
            ...formData,
            ...(photoUrl && {
              profile_photo: photoUrl,
              profile_photo_updated_at: new Date().toISOString(),
            }),
          });
        }

        setProfilePhoto(null);
        setPhotoPreview(null);
        setIsEditing(false);
        toast({
          title: "Profile updated",
          description: "Your changes were saved successfully.",
        });
      } else {
        throw new Error(responseBody?.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(user?.role === "admin" ? "/admin/dashboard" : "/employee/dashboard");
  };

  return (
    <div className="min-h-screen bg-surface p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mb-2 -ml-2 h-8 rounded-lg px-2 text-on-surface-variant hover:text-on-surface"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-headline font-bold text-on-surface">Profile</h1>
            <p className="text-sm text-on-surface-variant">
              {isEditing ? "Edit your account details." : "View your account details."}
            </p>
          </div>
          <Button
            type="button"
            variant={isEditing ? "secondary" : "outline"}
            onClick={() => setIsEditing((s) => !s)}
            disabled={loading}
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileImageSrc || undefined} alt="Profile" />
                  <AvatarFallback className="bg-surface-container text-on-surface">
                    {(user?.name?.charAt(0) || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {isEditing && (
                  <Label
                    className={cn(
                      "absolute -bottom-1 -right-1 inline-flex h-10 w-10 cursor-pointer items-center justify-center",
                      "rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface",
                      "shadow-sm hover:bg-surface-container",
                    )}
                  >
                    <span className="sr-only">Upload profile photo</span>
                    <Camera className="h-4 w-4" />
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </Label>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold text-on-surface truncate">
                  {user?.name || "User"}
                </div>
                <div className="text-sm text-on-surface-variant">
                  {user?.role || "Employee"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Name
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <div className="text-sm font-medium text-on-surface">
                    {user?.name || "-"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <div className="text-sm font-medium text-on-surface">
                    {user?.email || "-"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Contact
                </Label>
                {isEditing ? (
                  <Input
                    type="tel"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                ) : (
                  <div className="text-sm font-medium text-on-surface">
                    {user?.contact || "-"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Date of Birth
                </Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                ) : (
                  <div className="text-sm font-medium text-on-surface">
                    {user?.dob || "-"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Gender
                </Label>
                {isEditing ? (
                  <Select
                    value={formData.gender}
                    onValueChange={(v) => setFormData({ ...formData, gender: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm font-medium text-on-surface">
                    {user?.gender || "-"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Domain Expertise
                </Label>
                {isEditing ? (
                  <Select
                    value={formData.domain_expertise}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        domain_expertise: v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain expertise" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_PROFILE_ROLES.filter((role) => role !== "admin" && role !== "employee").map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm font-medium text-on-surface">
                    {user?.domain_expertise || "-"}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Address
              </Label>
              {isEditing ? (
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="min-h-28"
                  placeholder="Enter your address"
                />
              ) : (
                <div className="text-sm font-medium text-on-surface whitespace-pre-wrap">
                  {user?.address || "-"}
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-2">
                <Button type="button" onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
