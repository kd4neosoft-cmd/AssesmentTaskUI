import { Injectable } from '@angular/core';
import { ApiResponse, GridRequest, User } from '../User/user-list/user-list';
import { catchError, delay, map, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  
 private readonly baseUrl = 'http://localhost:5008/api/employees';

  constructor(private http: HttpClient) {}

  getUsers(request: GridRequest): Observable<ApiResponse<{ items: User[]; totalCount: number }>> {
    let params = new HttpParams()
      .set('pageNumber', request.pageNumber.toString())
      .set('pageSize', request.pageSize.toString())
      .set('sortBy', request.sortBy)
      .set('sortOrder', request.sortOrder);

    if (request.searchTerm) {
      params = params.set('searchTerm', request.searchTerm);
    }

    return this.http.get<ApiResponse<{ items: User[]; totalCount: number }>>(this.baseUrl, { params });
  }

  getUserById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/${id}`);
  }

  addUser(formData: FormData): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(this.baseUrl, formData);
  }

  updateUser(id: number, formData: FormData): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, formData);
  }

  deleteUser(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`);
  }

  getCountries(): Observable<ApiResponse<{ row_Id: number; name: string }[]>> {
    return this.http.get<ApiResponse<{ row_Id: number; name: string }[]>>(`${this.baseUrl}/countries`);
  }

  getStatesByCountry(countryId: number): Observable<ApiResponse<{ row_Id: number; name: string }[]>> {
    return this.http.get<ApiResponse<{ row_Id: number; name: string }[]>>(
      `${this.baseUrl}/countries/${countryId}/states`
    );
  }

  getCitiesByState(stateId: number): Observable<ApiResponse<{ row_Id: number; name: string }[]>> {
    return this.http.get<ApiResponse<{ row_Id: number; name: string }[]>>(
      `${this.baseUrl}/states/${stateId}/cities`
    );
  }
}
