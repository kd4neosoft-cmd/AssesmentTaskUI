import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NgbActiveModal,
  NgbCalendar,
  NgbDateStruct,
  NgbDatepicker,
} from '@ng-bootstrap/ng-bootstrap';
import { UserService } from '../../services/user';
import { ApiResponse, User } from '../user-list/user-list';

export interface Location {
  Row_Id: number;
  Name: string;
}

@Component({
  selector: 'app-add-edit-user',
  standalone: false,
  templateUrl: './add-edit-user.html',
  styleUrl: './add-edit-user.css',
})
export class AddEditUser {
  userForm!: FormGroup;
  isEditMode = false;
  userId: number | null = null;
  currentUser: any;
  imagePreview: string | null = null;

  countries: Location[] = [];
  states: Location[] = [];
  cities: Location[] = [];

  selectedFile: File | null = null;
  existingProfileImage: string | null = null;
  loading = false;
  backendErrors: { [key: string]: string } = {};
  submitMessage: string | null = null;
  submitError: string | null = null;
  fileError: string = '';

  today: string = new Date().toISOString().split('T')[0];

  model: {
    dateOfBirth: NgbDateStruct | null;
    dateOfJoinee: NgbDateStruct | null;
  } = {
    dateOfBirth: null,
    dateOfJoinee: null,
  };

  todayNgb: NgbDateStruct;

  private fieldLabels: { [key: string]: string } = {
    firstName: 'First Name',
    lastName: 'Last Name',
    emailAddress: 'Email Address',
    mobileNumber: 'Mobile Number',
    panNumber: 'PAN Number',
    passportNumber: 'Passport Number',
    dateOfBirth: 'Date of Birth',
    dateOfJoinee: 'Date of Joining',
    countryId: 'Country',
    stateId: 'State',
    cityId: 'City',
    gender: 'Gender',
    profileImage: 'Profile Picture',
  };

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private userService: UserService,
    private calendar: NgbCalendar,
  ) {
    const today = new Date();
    this.todayNgb = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCountries();
    this.setupFormValueChanges();

    if (this.isEditMode && this.userId) {
      this.loadUserData();
    }
  }

  initForm(): void {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''],
      emailAddress: ['', [Validators.required, Validators.email]],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      panNumber: ['', [Validators.required, Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')]],
      passportNumber: ['', [Validators.required, Validators.minLength(8)]],
      dateOfBirth: [''],
      dateOfJoinee: [''],
      countryId: ['', Validators.required],
      stateId: [{ value: '', disabled: true }, Validators.required],
      cityId: [{ value: '', disabled: true }, Validators.required],
      profileImage: [''],
      gender: ['', Validators.required],
      isActive: [true],
    });
  }

  setupFormValueChanges(): void {
    this.userForm.get('countryId')?.valueChanges.subscribe((countryId) => {
      this.clearFieldError('countryId');
      this.clearFieldError('stateId');
      this.clearFieldError('cityId');

      if (countryId) {
        this.loadStatesByCountry(countryId);
        this.userForm.get('stateId')?.enable();
        this.userForm.patchValue({ stateId: '', cityId: '' });
        this.cities = [];
        this.userForm.get('cityId')?.disable();
      } else {
        this.userForm.get('stateId')?.disable();
        this.userForm.get('cityId')?.disable();
        this.userForm.patchValue({ stateId: '', cityId: '' });
        this.states = [];
        this.cities = [];
      }
    });

    this.userForm.get('stateId')?.valueChanges.subscribe((stateId) => {
      this.clearFieldError('stateId');
      this.clearFieldError('cityId');

      if (stateId) {
        this.loadCitiesByState(stateId);
        this.userForm.get('cityId')?.enable();
        this.userForm.patchValue({ cityId: '' });
      } else {
        this.userForm.get('cityId')?.disable();
        this.userForm.patchValue({ cityId: '' });
        this.cities = [];
      }
    });

    this.userForm.get('cityId')?.valueChanges.subscribe(() => {
      this.clearFieldError('cityId');
    });

    const otherFields = [
      'firstName',
      'lastName',
      'emailAddress',
      'mobileNumber',
      'panNumber',
      'passportNumber',
      'dateOfBirth',
      'dateOfJoinee',
      'gender',
    ];
    otherFields.forEach((field) => {
      this.userForm.get(field)?.valueChanges.subscribe(() => {
        this.clearFieldError(field);
        this.submitError = null;
      });
    });

    this.userForm.get('dateOfBirth')?.valueChanges.subscribe((value) => {
      if (value) {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate >= today) {
          this.userForm.get('dateOfBirth')?.setErrors({ futureDate: true });
        }
      }
    });

    this.userForm.get('dateOfJoinee')?.valueChanges.subscribe((value) => {
      if (value) {
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate >= today) {
          this.userForm.get('dateOfJoinee')?.setErrors({ futureDate: true });
        }
      }
    });
  }

  loadCountries(): void {
    this.userService.getCountries().subscribe({
      next: (response: ApiResponse<Location[]>) => {
        if (response.Success) {
          this.countries = response.Data || [];
        }
      },
      error: (err) => {
        console.error('Failed to load countries:', err);
      },
    });
  }

  loadStatesByCountry(countryId: number): void {
    this.userService.getStatesByCountry(countryId).subscribe({
      next: (response: ApiResponse<Location[]>) => {
        if (response.Success) {
          this.states = response.Data || [];
          console.log(this.userForm.getRawValue(), 'loadStatesByCountry');
        }
      },
      error: (err) => {
        console.error('Failed to load states:', err);
        this.states = [];
      },
    });
  }

  loadCitiesByState(stateId: number): void {
    this.userService.getCitiesByState(stateId).subscribe({
      next: (response: ApiResponse<Location[]>) => {
        if (response.Success) {
          this.cities = response.Data || [];
          console.log(this.userForm.getRawValue(), 'loadCitiesByState');
        }
      },
      error: (err) => {
        console.error('Failed to load cities:', err);
        this.cities = [];
      },
    });
  }

  loadUserData(): void {
    if (!this.userId) return;

    this.loading = true;
    this.userService.getUserById(this.userId).subscribe({
      next: (response: ApiResponse<User>) => {
        if (response.Success && response.Data) {
          this.patchFormWithUserData(response.Data);
        } else {
          this.submitError = response.message || 'Failed to load user data';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading user data:', err);
        this.loading = false;
        this.submitError = 'Failed to load user data. Please try again.';
      },
    });
  }

  patchFormWithUserData(user: User): void {
    this.existingProfileImage = user.ProfileImage || null;
    this.model.dateOfBirth = this.parseDateToNgbDateStruct(user.DateOfBirth);
    this.model.dateOfJoinee = this.parseDateToNgbDateStruct(user.DateOfJoinee);
    this.currentUser = user;
    this.userForm.patchValue({
      firstName: user.FirstName,
      lastName: user.LastName,
      emailAddress: user.EmailAddress,
      mobileNumber: user.MobileNumber,
      panNumber: user.PanNumber,
      passportNumber: user.PassportNumber,
      dateOfBirth: user.DateOfBirth?.split('T')[0],
      dateOfJoinee: user.DateOfJoinee?.split('T')[0],
      countryId: user.CountryId,
      stateId: user.StateId,
      cityId: user.CityId,
      gender: user.Gender?.toString(),
      isActive: user.IsActive,
    });

    console.log(this.userForm.getRawValue(), user);
    if (user.CountryId) {
      this.loadStatesByCountry(user.CountryId);

      setTimeout(() => {
        this.userForm.get('stateId')?.enable();
        this.userForm.patchValue({ stateId: user.StateId });

        // ✅ Fix: Load cities BEFORE patching city value
        if (user.StateId) {
          this.loadCitiesByState(user.StateId);

          setTimeout(() => {
            this.userForm.get('cityId')?.enable();
            this.userForm.patchValue({ cityId: user.CityId }); // ✅ Patch AFTER cities load
          }, 300);
        }
      }, 300);
    }
    console.log(this.userForm.get('cityId').getRawValue());
  }

  // Convert ISO datetime string (yyyy-mm-ddTHH:MM:SS) to NgbDateStruct
  private parseDateToNgbDateStruct(dateString: string | null): NgbDateStruct | null {
    if (!dateString) return null;

    // ✅ Split by 'T' first to get only the date part
    const datePart = dateString.split('T')[0];

    // ✅ Now split by '-' to get year, month, day
    const [year, month, day] = datePart.split('-').map(Number);

    return {
      year: year,
      month: month,
      day: day,
    };
  }

  onCountryChange(): void {
    const countryId = this.userForm.get('countryId')?.value;
    if (countryId) {
      this.loadStatesByCountry(countryId);
      this.userForm.get('stateId')?.enable();
      this.userForm.patchValue({ stateId: '', cityId: '' });
      this.cities = [];
      this.userForm.get('cityId')?.disable();
    }
  }

  private formatDateForBackend(date: NgbDateStruct | null): string {
    if (!date) return '';
    const month = date.month < 10 ? `0${date.month}` : date.month;
    const day = date.day < 10 ? `0${date.day}` : date.day;
    return `${date.year}-${month}-${day}`;
  }

  // ✅ Convert ISO string to NgbDateStruct
  private parseDateFromBackend(dateString: string | null | undefined): NgbDateStruct | null {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return { year, month, day };
  }

  onDateOfJoineeChange(date: NgbDateStruct | null): void {
    if (date) {
      // Update form control with ISO string for backend
      const isoDate = this.formatDateForBackend(date);
      this.userForm.patchValue({ dateOfJoinee: isoDate });

      // Validate: must be in the past
      const selectedDate = new Date(date.year, date.month - 1, date.day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate >= today) {
        this.userForm.get('dateOfJoinee')?.setErrors({ futureDate: true });
      } else {
        const errors = this.userForm.get('dateOfJoinee')?.errors;
        if (errors) {
          delete errors['futureDate'];
          this.userForm.get('dateOfJoinee')?.setErrors(Object.keys(errors).length ? errors : null);
        }
      }

      // Mark as touched for validation
      this.userForm.get('dateOfJoinee')?.markAsTouched();
    }
  }

  onDateOfBirthChange(date: NgbDateStruct | null): void {
    if (date) {
      const isoDate = this.formatDateForBackend(date);
      this.userForm.patchValue({ dateOfBirth: isoDate });

      // Validate: must be in the past
      const selectedDate = new Date(date.year, date.month - 1, date.day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate >= today) {
        this.userForm.get('dateOfBirth')?.setErrors({ futureDate: true });
      } else {
        const errors = this.userForm.get('dateOfBirth')?.errors;
        if (errors) {
          delete errors['futureDate'];
          this.userForm.get('dateOfBirth')?.setErrors(Object.keys(errors).length ? errors : null);
        }
      }

      this.userForm.get('dateOfBirth')?.markAsTouched();
    }
  }

  onStateChange(): void {
    const stateId = this.userForm.get('stateId')?.value;
    if (stateId) {
      this.loadCitiesByState(stateId);
      this.userForm.get('cityId')?.enable();
      this.userForm.patchValue({ cityId: '' });
    }
  }

  // const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  // onFileSelected(event: any): void {
  //   const file = event.target.files[0];
  //   if (file) {
  //     const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  //     if (!allowedTypes.includes(file.type)) {
  //       this.fileError = 'Please select a valid image file (JPG, PNG, or GIF)';
  //       return;
  //     }

  //     const maxSize = 5 * 1024 * 1024;
  //     if (file.size > maxSize) {
  //       this.fileError = 'File size should not exceed 5MB';
  //       return;
  //     }

  //     this.selectedFile = file;
  //     this.fileError = '';
  //     this.userForm.patchValue({ profilePicture: file.name });
  //   }
  // }

  onFileSelected(event: any): void {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // Clear previous errors
    this.fileError = '';
    this.submitError = null;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.fileError = 'Please select a valid image file (JPG or PNG only)';
      this.clearFileInput();
      return;
    }

    // Validate file size (max 200 KB)
    const maxSize = 200 * 1024; // 200 KB in bytes
    if (file.size > maxSize) {
      this.fileError = `File size exceeds 200 KB (current: ${(file.size / 1024).toFixed(2)} KB)`;
      this.clearFileInput();
      return;
    }

    // File is valid - set it and create preview
    this.selectedFile = file;
    this.userForm.patchValue({
      profileImage: file.name,
    });

    // Create image preview
    this.createImagePreview(file);
  }

  private createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.fileError = '';
    this.clearFileInput();

    // Keep existing image if in edit mode
    if (this.isEditMode && this.existingProfileImage) {
      this.userForm.patchValue({
        profileImage: this.existingProfileImage,
      });
    } else {
      this.userForm.patchValue({
        profileImage: '',
      });
    }
  }

  private clearFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onImageError(event: any): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-avatar.jpg'; // Fallback image
    console.warn('Profile image failed to load:', this.existingProfileImage);
  }

  getProfileImageUrl(imagePath: string | null): string {
    if (!imagePath) {
      return 'assets/default-avatar.jpg';
    }

    // Ensure path starts with /
    const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `http://localhost:5008${path}`;
  }

  get f() {
    return this.userForm.controls;
  }

  getFieldLabel(fieldName: string): string {
    return this.fieldLabels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (this.submitError && fieldName === 'general') {
      return this.submitError;
    }

    const label = this.getFieldLabel(fieldName);

    if (field.errors['required']) return `${label} is required`;
    if (field.errors['minlength'])
      return `${label} must be at least ${field.errors['minlength'].requiredLength} characters`;
    if (field.errors['maxlength'])
      return `${label} must be at most ${field.errors['maxlength'].requiredLength} characters`;
    if (field.errors['email']) return 'Please enter a valid email address';
    if (field.errors['pattern']) {
      if (fieldName === 'mobileNumber') return 'Please enter a valid 10-digit mobile number';
      if (fieldName === 'panNumber') return 'Please enter a valid PAN (e.g., ABCDE1234F)';
      return `Please enter a valid ${label}`;
    }
    if (field.errors['futureDate']) return `${label} must be in the past`;

    return 'Invalid value';
  }

  shouldShowStateError(): boolean {
    const stateField = this.userForm.get('stateId');
    const countryField = this.userForm.get('countryId');
    return stateField && (stateField.dirty || stateField.touched) && !countryField?.value;
  }

  shouldShowCityError(): boolean {
    const cityField = this.userForm.get('cityId');
    const stateField = this.userForm.get('stateId');
    const countryField = this.userForm.get('countryId');
    return (
      cityField &&
      (cityField.dirty || cityField.touched) &&
      (!countryField?.value || !stateField?.value)
    );
  }

  getStateErrorMessage(): string {
    return !this.userForm.get('countryId')?.value
      ? 'Please choose country first'
      : 'State is required';
  }

  getCityErrorMessage(): string {
    if (!this.userForm.get('countryId')?.value) return 'Please choose country first';
    if (!this.userForm.get('stateId')?.value) return 'Please choose state first';
    return 'City is required';
  }

  clearFieldError(fieldName: string): void {
    if (this.backendErrors[fieldName]) {
      delete this.backendErrors[fieldName];
    }
    if (fieldName === 'profileImage') {
      this.fileError = '';
    }
  }

  markFormTouched(): void {
    Object.values(this.userForm.controls).forEach((control) => control.markAsTouched());
  }

  scrollToFirstInvalidControl(): void {
    const firstInvalid = document.querySelector('.is-invalid');
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // onSubmit(): void {
  //   this.markFormTouched();

  //   if (this.userForm.invalid) {
  //     this.scrollToFirstInvalidControl();
  //     return;
  //   }

  //   this.loading = true;
  //   this.submitError = null;
  //   this.submitMessage = null;
  //   this.backendErrors = {};
  //   this.fileError = '';

  //   const formData = new FormData();
  //   const formValue = this.userForm.value;

  //   formData.append('FirstName', formValue.firstName);
  //   formData.append('LastName', formValue.lastName || '');
  //   formData.append('EmailAddress', formValue.emailAddress);
  //   formData.append('MobileNumber', formValue.mobileNumber);
  //   formData.append('PanNumber', formValue.panNumber.toUpperCase());
  //   formData.append('PassportNumber', formValue.passportNumber.toUpperCase());
  //   formData.append('Gender', formValue.gender);
  //   formData.append('IsActive', formValue.isActive);
  //   formData.append('DateOfBirth', formValue.dateOfBirth);

  //   if (formValue.dateOfJoinee) {
  //     formData.append('DateOfJoinee', formValue.dateOfJoinee);
  //   }

  //   formData.append('CountryId', formValue.countryId);
  //   formData.append('StateId', formValue.stateId);
  //   formData.append('CityId', formValue.cityId);

  //   if (this.selectedFile) {
  //     formData.append('profileImage', this.selectedFile, this.selectedFile.name);
  //   }

  //   if (this.isEditMode && this.userId) {
  //     formData.append('Row_Id', this.userId.toString());
  //   }

  //   if (this.isEditMode) {
  //     this.userService.updateUser(this.userId!, formData).subscribe({
  //       next: (response: ApiResponse<boolean>) => this.handleResponse(response, 'updated'),
  //       error: (error) => this.handleError(error, 'update'),
  //     });
  //   } else {
  //     this.userService.addUser(formData).subscribe({
  //       next: (response: ApiResponse<number>) => this.handleResponse(response, 'added'),
  //       error: (error) => this.handleError(error, 'add'),
  //     });
  //   }
  // }

  onSubmit(): void {
    this.markFormTouched();

    if (this.userForm.invalid) {
      this.scrollToFirstInvalidControl();
      return;
    }

    this.loading = true;
    this.backendErrors = {};
    this.fileError = '';
    this.submitError = null;

    // Create FormData for file upload
    const formData = new FormData();
    const formValue = this.userForm.value;

    // Append all fields (PascalCase to match backend)
    formData.append('FirstName', formValue.firstName);
    formData.append('LastName', formValue.lastName || '');
    formData.append('EmailAddress', formValue.emailAddress);
    formData.append('MobileNumber', formValue.mobileNumber);
    formData.append('PanNumber', formValue.panNumber.toUpperCase());
    formData.append('PassportNumber', formValue.passportNumber.toUpperCase());
    formData.append('Gender', formValue.gender);
    formData.append('IsActive', formValue.isActive);
    formData.append('DateOfBirth', formValue.dateOfBirth);

    if (formValue.dateOfJoinee) {
      formData.append('DateOfJoinee', formValue.dateOfJoinee);
    }

    formData.append('CountryId', formValue.countryId);
    formData.append('StateId', formValue.stateId);
    formData.append('CityId', formValue.cityId);

    // Append file if selected
    if (this.selectedFile) {
      formData.append('profileImage', this.selectedFile, this.selectedFile.name);
    }

    // Add Row_Id for update
    if (this.isEditMode && this.userId) {
      formData.append('Row_Id', this.userId.toString());
    }

    // Make API call
    const request = this.isEditMode
      ? this.userService.updateUser(this.userId!, formData)
      : this.userService.addUser(formData);

    request.subscribe({
      next: (response: ApiResponse<any>) => {
        this.loading = false;
        if (response.Success) {
          this.activeModal.close(response.Data);
        } else {
          this.submitError = response.message || 'Failed to save user';
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error saving user:', error);
        this.submitError =
          error.error?.message ||
          `Failed to ${this.isEditMode ? 'update' : 'add'} user. Please try again.`;
      },
    });
  }

  private handleResponse(response: ApiResponse<any>, action: string): void {
    this.loading = false;

    if (response.Success) {
      this.submitMessage = `User ${action} successfully!`;

      setTimeout(() => {
        this.activeModal.close(response.Data);
      }, 1000);
    } else {
      this.submitError = response.message || `Failed to ${action} user`;
    }
  }

  private handleError(error: any, action: string): void {
    this.loading = false;
    console.error(`Error ${action}ing user:`, error);

    if (error.error?.message) {
      this.submitError = error.error.message;
    } else {
      this.submitError = `Failed to ${action} user. Please try again.`;
    }
  }

  onCancel(): void {
    this.activeModal.dismiss('User cancelled');
  }

  clearMessages(): void {
    this.submitError = null;
    this.submitMessage = null;
  }
}
