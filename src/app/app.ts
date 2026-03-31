import {Component, inject, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {moltendbClient, moltenDbResource} from "@moltendb-web/angular";

interface UserDoc {
  _key: string;
  name: string;
  role: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit{
  private client = moltendbClient();
  /**
   * Now using the 'moltenDbResource' pattern.
   * This provides: .value(), .isLoading() and .error()
   */
  users = moltenDbResource<UserDoc[]>('users', async (collection) => {
    console.log('Fetching users...');

    const result = await collection.get().exec();

    return result as unknown as UserDoc[];
  });
  async addUser() {
    const randomId = Math.random().toString(36).substring(2, 9);

    // Using the cleaner .insert() if your query client supports it,
    // or staying with .set()
    await this.client.collection('users').set([{
      name: 'Angular Dev ' ,
      role: 'Admin'
    }]).exec();

    console.log('Inserted user:', randomId);
  }

  async clearUsers() {
    // Just for testing the reactivity!
    await this.client.collection('users').delete().drop().exec();
  }

  public async ngOnInit(): Promise<void> {
    const users = await this.client.collection('users').get().exec();
    console.debug('App initialized', users);
  }
}