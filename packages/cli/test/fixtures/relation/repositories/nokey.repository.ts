import {DefaultCrudRepository} from '@loopback/repository';
import {Nokey} from '../models';
import {DbDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class NokeyRepository extends DefaultCrudRepository<
  Nokey,
  typeof Nokey.prototype.id
> {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(Nokey, dataSource);
  }
}
