import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { moltenDbResource, MoltenService } from "@moltendb-web/angular";

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
export class App {
  private molten = inject(MoltenService);

  /**
   * Now using the 'moltenDbResource' pattern.
   * This provides: .value(), .isLoading() and .error()
   */
  users = moltenDbResource<UserDoc[]>('users', async (client) => {
    console.log('Fetching users...');
    // We expect an array of users
    const result = await client.collection('users').get().exec();
    return result as unknown as UserDoc[];
  });

  async addUser() {
    const randomId = Math.random().toString(36).substring(2, 9);

    // Using the cleaner .insert() if your query client supports it,
    // or staying with .set()
    await this.molten.client.collection('users').set({
      [randomId]: {
        name: 'Angular Dev ' + randomId,
        role: 'Admin'
      }
    }).exec();

    console.log('Inserted user:', randomId);
  }

  async clearUsers() {
    // Just for testing the reactivity!
    await this.molten.client.collection('users').delete().drop().exec();
  }
}