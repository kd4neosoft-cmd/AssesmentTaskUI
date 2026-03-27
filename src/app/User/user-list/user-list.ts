import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../services/user';
import { AddEditUser } from '../add-edit-user/add-edit-user';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

export interface User {
  Row_Id?: number;
  EmployeeCode?: string;
  FirstName?: string;
  LastName?: string;
  CountryId?: number;
  StateId?: number;
  CityId?: number;
  EmailAddress: string;
  MobileNumber?: string;
  PanNumber: string;
  PassportNumber: string;
  ProfileImage?: string;
  Gender?: number;
  IsActive: boolean;
  DateOfBirth?: string;
  DateOfJoinee?: string;
  CreatedDate?: string;
  UpdatedDate?: string;
}

export interface ApiResponse<T> {
  Success: boolean;
  message: string;
  statusCode: number;
  Data: any;
  pagination?: {
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface GridRequest {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  sortBy?: string;
  sortOrder: 'ASC' | 'DESC';
}

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList {
  users: User[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  page = 1;
  pageSize = 10;
  collectionSize = 0;
  searchTerm = '';
  sortBy = 'Row_Id';
  sortOrder: 'ASC' | 'DESC' = 'ASC';

  private readonly apiUrl = 'http://localhost:5008/api/employees';

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // loadUsers(): void {
  //   this.loading = true;
  //   this.error = null;
  //   this.successMessage = null;

  //   const request: GridRequest = {
  //     pageNumber: this.page,
  //     pageSize: this.pageSize,
  //     searchTerm: this.searchTerm || undefined,
  //     sortBy: this.sortBy,
  //     sortOrder: this.sortOrder
  //   };

  //   this.userService.getUsers(request)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (response: ApiResponse<{ items: User[]; totalCount: number }>) => {
  //         console.log(response)
  //         if (response.Success) {
  //           this.users = response.Data.Items || [];
  //           this.collectionSize = response.Data.totalCount || 0;
  //           this.loading = false;
  //         } else {
  //           this.error = response.message || 'Failed to load users';
  //           this.loading = false;
  //         }
  //       },
  //       error: (err) => {
  //         this.error = 'Failed to load users. Please check if API is running.';
  //         this.loading = false;
  //         console.error('API Error:', err);
  //       }
  //     });
  // }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const request: GridRequest = {
      pageNumber: this.page,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm || undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };

    this.userService
      .getUsers(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiResponse<{ items: User[]; totalCount: number }>) => {
          if (response.Success) {
            this.users = response.Data.Items || [];
            this.collectionSize = response.Data.TotalCount || 0;
            this.loading = false;
          } else {
            this.error = response.message || 'Failed to load users';
            this.loading = false;
          }
        },
        error: (err) => {
          this.error = 'Failed to load users. Please check if API is running.';
          this.loading = false;
          console.error('API Error:', err);
        },
      });
  }

  openAddUserModal(): void {
    const modalRef = this.modalService.open(AddEditUser, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
    modalRef.componentInstance.isEditMode = false;
    modalRef.componentInstance.userId = null;

    modalRef.result.then(
      (result) => {
        this.successMessage = 'User added successfully!';
        this.loadUsers();
        setTimeout(() => (this.successMessage = null), 3000);
      },
      (reason) => {
        console.log('Modal dismissed:', reason);
      },
    );
  }

  openEditUserModal(user: User): void {
    const modalRef = this.modalService.open(AddEditUser, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.isEditMode = true;
    modalRef.componentInstance.userId = user.Row_Id || 0;

    modalRef.result.then(
      (result) => {
        this.successMessage = 'User updated successfully!';
        this.loadUsers();
        setTimeout(() => (this.successMessage = null), 3000);
      },
      (reason) => {
        console.log('Modal dismissed:', reason);
      },
    );
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onPageSizeChange(): void {
    this.page = 1; 
    this.loadUsers();
  }

  onSearch(): void {
    this.page = 1; 
    this.loadUsers();
  }

  getStartIndex(): number {
    if (this.collectionSize === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    if (this.collectionSize === 0) return 0;
    const end = this.page * this.pageSize;
    return end > this.collectionSize ? this.collectionSize : end;
  }

  onSort(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = field;
      this.sortOrder = 'ASC';
    }
    this.page = 1;
    this.loadUsers();
  }

  onEdit(user: User): void {
    this.openEditUserModal(user);
  }

  onDelete(user: User): void {
    const fullName = `${user.FirstName || ''} ${user.LastName || ''}`.trim() || 'this user';

    if (confirm(`Are you sure you want to delete ${fullName}? This action cannot be undone.`)) {
      this.loading = true;

      this.userService
        .deleteUser(user.Row_Id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: ApiResponse<boolean>) => {
            if (response.Success) {
              this.successMessage = 'User deleted successfully!';
              this.loadUsers();
              setTimeout(() => (this.successMessage = null), 3000);
            } else {
              this.error = response.message || 'Failed to delete user';
              this.loading = false;
            }
          },
          error: (err) => {
            this.error = 'Failed to delete user. Please try again.';
            this.loading = false;
            console.error('Delete Error:', err);
          },
        });
    }
  }

  toggleActiveStatus(user: User): void {
    this.openEditUserModal(user);
  }
  get totalPages(): number {
    return Math.ceil(this.collectionSize / this.pageSize);
  }

  getSortIcon(field: string): string {
    if (this.sortBy !== field) return 'bi-arrow-down-up';
    return this.sortOrder === 'ASC' ? 'bi-arrow-up' : 'bi-arrow-down';
  }

  getGenderLabel(gender: number): string {
    switch (gender) {
      case 1:
        return 'Male';
      case 2:
        return 'Female';
      case 3:
        return 'Other';
      default:
        return 'N/A';
    }
  }

  getProfileImageUrl(imagePath: string | null): string {
    if (!imagePath) return 'assets/default-avatar.jpg';
    return `http://localhost:5008${imagePath}`;
  }

  clearMessages(): void {
    this.error = null;
    this.successMessage = null;
  }
}
